export const COL = {
  users: "users",
  classes: "classes",
  enrollments: "enrollments",
  submissions: "submissions",
  comments: "comments",
  commentVotes: "commentVotes",
  submissionRatings: "submissionRatings",
} as const;

export function enrollmentDocId(classId: string, userId: string): string {
  return `${classId}_${userId}`;
}

export function commentVoteDocId(commentId: string, userId: string): string {
  return `${commentId}_${userId}`;
}

export function submissionRatingDocId(submissionId: string, userId: string): string {
  return `${submissionId}_${userId}`;
}
