import { NextRequest, NextResponse } from "next/server";
import { getCasCallbackUrl } from "@/lib/env";

const CAS_LOGIN = "https://cas.sfu.ca/cas/login";

const PERSONA_COOKIE = "vsp_login_persona";

export async function GET(req: NextRequest) {
  if (process.env.ENABLE_CAS !== "true") {
    return NextResponse.json({ error: "CAS is disabled" }, { status: 400 });
  }
  const raw = req.nextUrl.searchParams.get("persona");
  const persona =
    raw === "instructor" || raw === "student" ? raw : undefined;

  const service = encodeURIComponent(getCasCallbackUrl());
  const url = `${CAS_LOGIN}?service=${service}`;
  const res = NextResponse.redirect(url);
  if (persona) {
    res.cookies.set(PERSONA_COOKIE, persona, {
      path: "/",
      maxAge: 600,
      sameSite: "lax",
      httpOnly: true,
    });
  }
  return res;
}
