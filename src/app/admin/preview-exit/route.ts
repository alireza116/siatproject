import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRequestOrigin } from "@/lib/env";
import { VIEW_AS_COOKIE, VIEW_AS_COOKIE_BASE } from "@/lib/view-as";

/** GET /admin/preview-exit  — clears the viewAs cookie and returns to admin page */
export async function GET(req: NextRequest) {
  const origin = getRequestOrigin(req);
  const session = await auth();
  if (session?.user?.role !== "GLOBAL_ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", origin));
  }

  const res = NextResponse.redirect(new URL("/admin", origin));
  // Expire with the same Path/flags as /admin/preview sets; otherwise browsers keep the cookie.
  res.cookies.set(VIEW_AS_COOKIE, "", {
    ...VIEW_AS_COOKIE_BASE,
    maxAge: 0,
  });
  return res;
}
