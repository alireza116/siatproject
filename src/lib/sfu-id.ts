/** SFU computing ID (e.g. jsmith1) or 9-digit student number */
export function isValidSfuId(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  if (/^\d{9}$/.test(s)) return true;
  if (/^[a-z][a-z0-9._-]{1,30}$/i.test(s)) return true;
  return false;
}

export function normalizeSfuId(raw: string): string {
  return raw.trim().toLowerCase();
}
