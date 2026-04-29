/**
 * Single line for public gallery / project headers.
 * When display labels match SFU ids (common with no custom display name), show each author once.
 */
export function formatPublicAuthorsLine(
  authorNames: string[],
  authorSfuIds: string[],
  showNames: boolean,
  showIds: boolean,
): string | null {
  if (!showNames && !showIds) return null;
  const len = Math.max(authorNames.length, authorSfuIds.length);
  if (len === 0) return null;

  const parts: string[] = [];
  for (let i = 0; i < len; i++) {
    const name = showNames ? (authorNames[i]?.trim() ?? "") : "";
    const id = showIds ? (authorSfuIds[i]?.trim() ?? "") : "";
    const same = name.length > 0 && id.length > 0 && name.toLowerCase() === id.toLowerCase();
    if (same) {
      parts.push(name);
    } else if (name && id) {
      parts.push(`${name} (${id})`);
    } else if (name || id) {
      parts.push(name || id);
    }
  }

  return parts.length > 0 ? parts.join(", ") : null;
}
