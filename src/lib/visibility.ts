import type { ClassDoc } from "@/lib/models/Class";
import type { SubmissionDoc } from "@/lib/models/Submission";

export type Visibility = "PRIVATE" | "PUBLIC";

export function effectiveVisibility(
  sub: Pick<SubmissionDoc, "visibility">,
  cls: Pick<ClassDoc, "defaultVisibility">
): Visibility {
  return (sub.visibility ?? cls.defaultVisibility) as Visibility;
}

export function effectiveCommentsOnPublic(
  sub: Pick<SubmissionDoc, "commentsEnabled">,
  cls: Pick<ClassDoc, "commentsOnPublic">
): boolean {
  return sub.commentsEnabled ?? cls.commentsOnPublic;
}
