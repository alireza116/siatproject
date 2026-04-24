/** Fields commonly indexed for project list search (title, topic, people). */
export type ProjectSearchFields = {
  title: string;
  groupName: string;
  description?: string;
  authorNames?: string[];
  authorSfuIds?: string[];
};

export function buildProjectSearchHaystack(f: ProjectSearchFields): string {
  return [
    f.title,
    f.groupName,
    f.description ?? "",
    ...(f.authorNames ?? []),
    ...(f.authorSfuIds ?? []),
  ]
    .join("\n")
    .toLowerCase();
}

/**
 * Case-insensitive substring match. Multiple whitespace-separated tokens must
 * all appear somewhere in the haystack (order-independent).
 */
export function projectMatchesSearchQuery(haystackLower: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.every((t) => haystackLower.includes(t));
}

export function projectMatchesSearchFields(fields: ProjectSearchFields, query: string): boolean {
  return projectMatchesSearchQuery(buildProjectSearchHaystack(fields), query);
}
