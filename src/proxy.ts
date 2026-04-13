import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const loggedIn = !!req.auth;
  const sfuId = req.auth?.user?.sfuId;
  const role = req.auth?.user?.role;

  if (!loggedIn) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Admin-only routes.
  if (pathname.startsWith("/admin")) {
    if (role !== "GLOBAL_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (!sfuId && !pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/onboarding/sfu-id", req.url));
  }
  if (sfuId && pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/classes/:path*", "/onboarding/:path*", "/my-submissions/:path*", "/admin", "/admin/:path*"],
};
