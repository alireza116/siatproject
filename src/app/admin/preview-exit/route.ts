import { NextRequest, NextResponse } from "next/server";
import { getRequestOrigin } from "@/lib/env";
import { VIEW_AS_COOKIE } from "@/lib/view-as";

/** GET /admin/preview-exit  — clears the viewAs cookie and returns to admin page */
export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/admin", getRequestOrigin(req)));
  res.cookies.delete(VIEW_AS_COOKIE);
  return res;
}
