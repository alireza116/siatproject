export type Visibility = "PRIVATE" | "PUBLIC";

export type SubmissionVisibilityFields = {
  visibility?: "PRIVATE" | "PUBLIC";
  commentsEnabled?: boolean;
};

export type ClassVisibilityFields = {
  defaultVisibility: "PRIVATE" | "PUBLIC";
  commentsOnPublic: boolean;
};

export function effectiveVisibility(
  sub: Pick<SubmissionVisibilityFields, "visibility">,
  cls: Pick<ClassVisibilityFields, "defaultVisibility">
): Visibility {
  return (sub.visibility ?? cls.defaultVisibility) as Visibility;
}

export function effectiveCommentsOnPublic(
  sub: Pick<SubmissionVisibilityFields, "commentsEnabled">,
  cls: Pick<ClassVisibilityFields, "commentsOnPublic">
): boolean {
  return sub.commentsEnabled ?? cls.commentsOnPublic;
}
