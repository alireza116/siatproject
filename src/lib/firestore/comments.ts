import { FieldValue } from "firebase-admin/firestore";
import { getFirestoreDb } from "@/lib/firebase/admin";
import { COL, commentVoteDocId, submissionRatingDocId } from "@/lib/firestore/constants";
import { asDate } from "@/lib/firestore/dates";

export type CommentRecord = {
  id: string;
  submissionId: string;
  userId: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
};

function mapComment(id: string, data: FirebaseFirestore.DocumentData): CommentRecord {
  return {
    id,
    submissionId: data.submissionId,
    userId: data.userId,
    body: data.body,
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
  };
}

export async function listCommentsForSubmission(submissionId: string): Promise<CommentRecord[]> {
  const db = getFirestoreDb();
  const q = await db
    .collection(COL.comments)
    .where("submissionId", "==", submissionId)
    .orderBy("createdAt", "asc")
    .get();
  return q.docs.map((d) => mapComment(d.id, d.data()));
}

export async function findCommentBySubmissionAndUser(
  submissionId: string,
  userId: string
): Promise<CommentRecord | null> {
  const db = getFirestoreDb();
  const q = await db
    .collection(COL.comments)
    .where("submissionId", "==", submissionId)
    .where("userId", "==", userId)
    .limit(1)
    .get();
  if (q.empty) return null;
  const d = q.docs[0]!;
  return mapComment(d.id, d.data());
}

export async function getCommentById(commentId: string): Promise<CommentRecord | null> {
  const db = getFirestoreDb();
  const snap = await db.collection(COL.comments).doc(commentId).get();
  if (!snap.exists) return null;
  return mapComment(snap.id, snap.data()!);
}

export async function createComment(input: {
  submissionId: string;
  userId: string;
  body: string;
}): Promise<string> {
  const db = getFirestoreDb();
  const ref = db.collection(COL.comments).doc();
  await ref.set({
    submissionId: input.submissionId,
    userId: input.userId,
    body: input.body,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateCommentBody(commentId: string, body: string): Promise<void> {
  const db = getFirestoreDb();
  await db.collection(COL.comments).doc(commentId).update({
    body,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function deleteComment(commentId: string): Promise<void> {
  const db = getFirestoreDb();
  await db.collection(COL.comments).doc(commentId).delete();
}

export async function listCommentIdsForSubmission(submissionId: string): Promise<string[]> {
  const db = getFirestoreDb();
  const q = await db.collection(COL.comments).where("submissionId", "==", submissionId).select().get();
  return q.docs.map((d) => d.id);
}

export async function deleteAllCommentsForSubmission(submissionId: string): Promise<void> {
  const db = getFirestoreDb();
  const q = await db.collection(COL.comments).where("submissionId", "==", submissionId).get();
  const batch = db.batch();
  for (const d of q.docs) {
    batch.delete(d.ref);
  }
  if (!q.empty) await batch.commit();
}

export async function deleteCommentsForSubmissions(submissionIds: string[]): Promise<void> {
  if (submissionIds.length === 0) return;
  const db = getFirestoreDb();
  const chunk = 30;
  for (let i = 0; i < submissionIds.length; i += chunk) {
    const part = submissionIds.slice(i, i + chunk);
    const q = await db.collection(COL.comments).where("submissionId", "in", part).get();
    const batch = db.batch();
    for (const d of q.docs) {
      batch.delete(d.ref);
    }
    if (!q.empty) await batch.commit();
  }
}

export async function deleteCommentVotesForCommentIds(commentIds: string[]): Promise<void> {
  if (commentIds.length === 0) return;
  const db = getFirestoreDb();
  const chunk = 30;
  for (let i = 0; i < commentIds.length; i += chunk) {
    const part = commentIds.slice(i, i + chunk);
    const q = await db.collection(COL.commentVotes).where("commentId", "in", part).get();
    const batch = db.batch();
    for (const d of q.docs) {
      batch.delete(d.ref);
    }
    if (!q.empty) await batch.commit();
  }
}

export async function deleteCommentVotesForComment(commentId: string): Promise<void> {
  const db = getFirestoreDb();
  const q = await db.collection(COL.commentVotes).where("commentId", "==", commentId).get();
  const batch = db.batch();
  for (const d of q.docs) {
    batch.delete(d.ref);
  }
  if (!q.empty) await batch.commit();
}

export async function setCommentVote(
  commentId: string,
  userId: string,
  value: 1 | -1 | null
): Promise<void> {
  const db = getFirestoreDb();
  const id = commentVoteDocId(commentId, userId);
  const ref = db.collection(COL.commentVotes).doc(id);
  if (value === null) {
    await ref.delete().catch(() => {});
  } else {
    await ref.set({
      commentId,
      userId,
      value,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

export async function setSubmissionRating(
  submissionId: string,
  userId: string,
  stars: number | null
): Promise<void> {
  const db = getFirestoreDb();
  const id = submissionRatingDocId(submissionId, userId);
  const ref = db.collection(COL.submissionRatings).doc(id);
  if (stars === null) {
    await ref.delete().catch(() => {});
  } else {
    await ref.set({
      submissionId,
      userId,
      stars,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

export async function deleteSubmissionRatingsForSubmission(submissionId: string): Promise<void> {
  const db = getFirestoreDb();
  const q = await db.collection(COL.submissionRatings).where("submissionId", "==", submissionId).get();
  const batch = db.batch();
  for (const d of q.docs) {
    batch.delete(d.ref);
  }
  if (!q.empty) await batch.commit();
}

export async function deleteSubmissionRatingsForSubmissions(submissionIds: string[]): Promise<void> {
  if (submissionIds.length === 0) return;
  const db = getFirestoreDb();
  const chunk = 30;
  for (let i = 0; i < submissionIds.length; i += chunk) {
    const part = submissionIds.slice(i, i + chunk);
    const q = await db.collection(COL.submissionRatings).where("submissionId", "in", part).get();
    const batch = db.batch();
    for (const d of q.docs) {
      batch.delete(d.ref);
    }
    if (!q.empty) await batch.commit();
  }
}

export async function listCommentsForSubmissions(submissionIds: string[]): Promise<CommentRecord[]> {
  if (submissionIds.length === 0) return [];
  const db = getFirestoreDb();
  const out: CommentRecord[] = [];
  const chunk = 30;
  for (let i = 0; i < submissionIds.length; i += chunk) {
    const part = submissionIds.slice(i, i + chunk);
    const q = await db.collection(COL.comments).where("submissionId", "in", part).get();
    for (const d of q.docs) {
      out.push(mapComment(d.id, d.data()));
    }
  }
  out.sort((a, b) => {
    const s = a.submissionId.localeCompare(b.submissionId);
    if (s !== 0) return s;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
  return out;
}
