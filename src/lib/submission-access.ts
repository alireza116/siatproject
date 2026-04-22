import { idEq } from "@/lib/class-access";
import type { LeanSubmissionFull } from "@/lib/types/lean";

export function isSubmissionAuthor(
  sub: Pick<LeanSubmissionFull, "authorUserIds" | "createdById">,
  userId: string
): boolean {
  if (idEq(sub.createdById, userId)) return true;
  return sub.authorUserIds?.some((id) => idEq(id, userId)) ?? false;
}
