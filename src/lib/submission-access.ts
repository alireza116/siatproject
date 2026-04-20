import { idEq } from "@/lib/class-access";
import type { LeanClassFull, LeanSubmissionFull } from "@/lib/types/lean";

export function isSubmissionAuthor(
  sub: Pick<LeanSubmissionFull, "authorUserIds" | "createdById">,
  userId: string
): boolean {
  if (idEq(sub.createdById, userId)) return true;
  return sub.authorUserIds?.some((id) => idEq(id, userId)) ?? false;
}

/**
 * Enrolled students can see every submission in their class, regardless of
 * the submission's PUBLIC/PRIVATE setting. Visibility only controls whether a
 * submission is exposed to the outside world via the public gallery — it is
 * not a gate inside the class itself.
 *
 * Callers must verify enrollment (e.g. via `canAccessClassOrGlobalAdmin`)
 * before invoking this helper. Parameters are kept for API compatibility and
 * to make the call site read naturally.
 */
export function canStudentViewSubmissionInClass(
  _sub: LeanSubmissionFull,
  _cls: LeanClassFull,
  _userId: string
): boolean {
  return true;
}
