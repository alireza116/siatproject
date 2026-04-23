import {
  deleteCommentVotesForCommentIds,
  deleteCommentsForSubmissions,
  deleteSubmissionRatingsForSubmissions,
} from "@/lib/firestore/comments";
import { deleteClass } from "@/lib/firestore/classes";
import { deleteEnrollmentsForClass } from "@/lib/firestore/enrollments";
import {
  deleteSubmissionsForClass,
  listSubmissionIdsForClass,
} from "@/lib/firestore/submissions";
import { getFirestoreDb } from "@/lib/firebase/admin";
import { COL } from "@/lib/firestore/constants";

/**
 * All comment document IDs for the given submissions (batched `in` queries).
 */
export async function listCommentIdsForSubmissions(submissionIds: string[]): Promise<string[]> {
  if (submissionIds.length === 0) return [];
  const db = getFirestoreDb();
  const chunk = 30;
  const ids: string[] = [];
  for (let i = 0; i < submissionIds.length; i += chunk) {
    const part = submissionIds.slice(i, i + chunk);
    const q = await db.collection(COL.comments).where("submissionId", "in", part).select().get();
    for (const d of q.docs) ids.push(d.id);
  }
  return ids;
}

export type ClassPurgeStats = {
  submissionCount: number;
  commentCount: number;
};

/**
 * Irreversibly removes a class and all dependent Firestore data:
 * comment votes → star ratings → comments → submissions → enrollments → class doc.
 *
 * Order matters: votes reference comments; ratings reference submissions.
 */
export async function purgeClassAndRelatedData(classId: string): Promise<ClassPurgeStats> {
  const submissionIds = await listSubmissionIdsForClass(classId);
  const commentIds = await listCommentIdsForSubmissions(submissionIds);

  await deleteCommentVotesForCommentIds(commentIds);
  await deleteSubmissionRatingsForSubmissions(submissionIds);
  await deleteCommentsForSubmissions(submissionIds);
  await deleteSubmissionsForClass(classId);
  await deleteEnrollmentsForClass(classId);
  await deleteClass(classId);

  return {
    submissionCount: submissionIds.length,
    commentCount: commentIds.length,
  };
}
