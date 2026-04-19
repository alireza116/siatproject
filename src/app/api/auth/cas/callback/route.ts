import { NextRequest, NextResponse } from "next/server";
import { setAuthJwtCookie } from "@/lib/auth/cas-session";
import { validateCasTicket } from "@/lib/cas/validate";
import { getCasCallbackUrl, getRequestOrigin } from "@/lib/env";
import {
  createUserCas,
  findUserByCasUsername,
  getUserById,
  setUserRole,
  updateUserSfuFromCas,
} from "@/lib/firestore/users";
import { isValidSfuId, normalizeSfuId } from "@/lib/sfu-id";
import { isBootstrapAdmin } from "@/lib/admin";

export async function GET(req: NextRequest) {
  if (process.env.ENABLE_CAS !== "true") {
    return NextResponse.json({ error: "CAS is disabled" }, { status: 400 });
  }

  const ticket = req.nextUrl.searchParams.get("ticket");
  if (!ticket) {
    return NextResponse.redirect(casErrorUrl(req, "cas_missing_ticket"));
  }

  const serviceUrl = getCasCallbackUrl();
  const result = await validateCasTicket(ticket, serviceUrl);
  if (!result.ok) {
    return NextResponse.redirect(casErrorUrl(req, result.message));
  }

  const username = result.user.username.trim();

  try {
    let user = await findUserByCasUsername(username);
    let sfuId: string | undefined = user?.sfuId;

    if (!user) {
      const initialSfu = isValidSfuId(username) ? normalizeSfuId(username) : undefined;
      const id = await createUserCas({
        casUsername: username,
        name: username,
        sfuId: initialSfu,
      });
      user = await getUserById(id);
      if (!user) {
        return NextResponse.redirect(casErrorUrl(req, "cas_user_create_failed"));
      }
      sfuId = user.sfuId ?? undefined;
    } else if (!sfuId && isValidSfuId(username)) {
      const normalized = normalizeSfuId(username);
      await updateUserSfuFromCas(user.id, normalized);
      sfuId = normalized;
    }

    // Auto-promote bootstrap admins to GLOBAL_ADMIN on every login.
    if (user && isBootstrapAdmin(username) && user.role !== "GLOBAL_ADMIN") {
      await setUserRole(user.id, "GLOBAL_ADMIN");
      user = { ...user, role: "GLOBAL_ADMIN" };
    }

    await setAuthJwtCookie({
      sub: user.id,
      name: user.name,
      email: user.email,
      picture: user.image,
      sfuId: sfuId ?? null,
      role: user.role,
    });

    const dest = user.sfuId ? "/dashboard" : "/onboarding/sfu-id";
    return NextResponse.redirect(new URL(dest, getRequestOrigin(req)));
  } catch (err: unknown) {
    if (isFirestoreNotProvisionedError(err)) {
      return NextResponse.redirect(casErrorUrl(req, "firestore_not_ready"));
    }
    console.error("CAS auth error:", err);
    return NextResponse.redirect(casErrorUrl(req, "auth_error"));
  }
}

function isFirestoreNotProvisionedError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: number | string; message?: string };
  // gRPC NOT_FOUND (5): default Firestore database missing or wrong project / API.
  if (e.code === 5 || e.code === "NOT_FOUND") return true;
  if (typeof e.message === "string" && e.message.includes("NOT_FOUND")) return true;
  return false;
}

function casErrorUrl(req: NextRequest, message: string): URL {
  const u = new URL("/", getRequestOrigin(req));
  u.searchParams.set("error", message);
  return u;
}
