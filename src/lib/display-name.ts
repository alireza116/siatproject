import type { UserRecord } from "@/lib/firestore/users";

/**
 * In-app label: user-chosen display name, else SFU computing ID, else legacy
 * profile name (e.g. OAuth), else a generic fallback.
 */
export function appDisplayLabel(user: {
  displayName?: string | null;
  sfuId?: string | null;
  name?: string | null;
}): string {
  const alias = user.displayName?.trim();
  if (alias) return alias;
  const id = user.sfuId?.trim();
  if (id) return id;
  const n = user.name?.trim();
  if (n) return n;
  return "User";
}

export function appDisplayLabelFromRecord(u: UserRecord): string {
  return appDisplayLabel({
    displayName: u.displayName,
    sfuId: u.sfuId,
    name: u.name,
  });
}
