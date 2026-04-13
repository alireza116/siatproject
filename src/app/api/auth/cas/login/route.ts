import { NextRequest, NextResponse } from "next/server";
import { getCasCallbackUrl } from "@/lib/env";

const CAS_LOGIN = "https://cas.sfu.ca/cas/login";

export async function GET(req: NextRequest) {
  if (process.env.ENABLE_CAS !== "true") {
    return NextResponse.json({ error: "CAS is disabled" }, { status: 400 });
  }
  const service = encodeURIComponent(getCasCallbackUrl());
  const url = `${CAS_LOGIN}?service=${service}`;
  return NextResponse.redirect(url);
}
