import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRequestOrigin } from "@/lib/env";
import { VIEW_AS_COOKIE } from "@/lib/view-as";

/** GET /admin/preview?userId=<id>  — sets the viewAs cookie and redirects to /dashboard */
export async function GET(req: NextRequest) {
  const origin = getRequestOrigin(req);
  const session = await auth();
  if (session?.user?.role !== "GLOBAL_ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", origin));
  }

  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.redirect(new URL("/admin", origin));
  }

  const res = NextResponse.redirect(new URL("/dashboard", origin));
  res.cookies.set(VIEW_AS_COOKIE, userId, {
    path: "/",
    maxAge: 60 * 60, // 1 hour
    sameSite: "lax",
    httpOnly: true,
  });
  return res;
}
