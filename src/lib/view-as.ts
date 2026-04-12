import { cookies } from "next/headers";

export const VIEW_AS_COOKIE = "admin_view_as";

/** Shared flags so set/clear target the same browser cookie jar entry. */
export const VIEW_AS_COOKIE_BASE = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
};

/**
 * Returns the userId the admin is previewing as, or null if not in preview mode.
 * Only works for GLOBAL_ADMIN; regular users always get null.
 */
export async function getViewAsUserId(role?: string): Promise<string | null> {
  if (role !== "GLOBAL_ADMIN") return null;
  const store = await cookies();
  return store.get(VIEW_AS_COOKIE)?.value ?? null;
}
