import { NextRequest, NextResponse } from "next/server";
import { VIEW_AS_COOKIE } from "@/lib/view-as";

/** GET /admin/preview-exit  — clears the viewAs cookie and returns to admin page */
export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/admin", req.url));
  res.cookies.delete(VIEW_AS_COOKIE);
  return res;
}
