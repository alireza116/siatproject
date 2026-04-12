import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/connect";
import { setAuthJwtCookie } from "@/lib/auth/cas-session";
import { validateCasTicket } from "@/lib/cas/validate";
import { getCasCallbackUrl, getRequestOrigin } from "@/lib/env";
import { User } from "@/lib/models/User";
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
  await dbConnect();

  let user = await User.findOne({ casUsername: username });
  let sfuId: string | undefined = user?.sfuId;

  if (!user) {
    const initialSfu = isValidSfuId(username) ? normalizeSfuId(username) : undefined;
    user = await User.create({
      casUsername: username,
      name: username,
      sfuId: initialSfu,
    });
    sfuId = user.sfuId ?? undefined;
  } else if (!sfuId && isValidSfuId(username)) {
    user.sfuId = normalizeSfuId(username);
    await user.save();
    sfuId = user.sfuId ?? undefined;
  }

  // Auto-promote bootstrap admins to GLOBAL_ADMIN on every login.
  if (isBootstrapAdmin(username) && user.role !== "GLOBAL_ADMIN") {
    user.role = "GLOBAL_ADMIN";
    await user.save();
  }

  await setAuthJwtCookie({
    sub: user._id.toString(),
    name: user.name,
    email: user.email,
    picture: user.image,
    sfuId: sfuId ?? null,
    role: user.role,
  });

  const dest = user.sfuId ? "/dashboard" : "/onboarding/sfu-id";
  return NextResponse.redirect(new URL(dest, getRequestOrigin(req)));
}

function casErrorUrl(req: NextRequest, message: string): URL {
  const u = new URL("/", getRequestOrigin(req));
  u.searchParams.set("error", message);
  return u;
}
