/**
 * Bootstrap admin IDs from the ADMIN_SFU_IDS environment variable.
 * These users are automatically promoted to GLOBAL_ADMIN on every login.
 * Returns lowercase SFU IDs (casUsername values).
 */
export function getBootstrapAdminIds(): string[] {
  return (process.env.ADMIN_SFU_IDS ?? "")
    .split(",")
    .map((id) => id.trim().toLowerCase())
    .filter(Boolean);
}

export function isBootstrapAdmin(casUsername: string): boolean {
  return getBootstrapAdminIds().includes(casUsername.toLowerCase());
}
