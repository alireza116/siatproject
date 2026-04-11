/** Mongoose `.lean()` is typed as a broad union; narrow to a single document. */
export function leanOne<T>(doc: unknown): T | null {
  if (doc == null || Array.isArray(doc)) {
    return null;
  }
  return doc as T;
}
