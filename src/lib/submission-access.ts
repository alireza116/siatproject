import { idEq } from "@/lib/class-access";
import { effectiveVisibility } from "@/lib/visibility";
import type { LeanClassFull, LeanSubmissionFull } from "@/lib/types/lean";

export function isSubmissionAuthor(
  sub: Pick<LeanSubmissionFull, "authorUserIds" | "createdById">,
  userId: string
): boolean {
  if (idEq(sub.createdById, userId)) return true;
  return sub.authorUserIds?.some((id) => idEq(id, userId)) ?? false;
}

/** Enrolled student (non-instructor) may open own work or classmates' public submissions. */
export function canStudentViewSubmissionInClass(
  sub: LeanSubmissionFull,
  cls: LeanClassFull,
  userId: string
): boolean {
  if (isSubmissionAuthor(sub, userId)) return true;
  return effectiveVisibility(sub, cls) === "PUBLIC";
}
