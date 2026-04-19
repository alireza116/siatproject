import { getFirestoreDb } from "@/lib/firebase/admin";
import { COL } from "@/lib/firestore/constants";

export type RatingStats = {
  average: number;
  count: number;
  userRating: number | null;
};

export async function getRatingStatsForSubmission(
  submissionId: string,
  userId?: string
): Promise<RatingStats> {
  const db = getFirestoreDb();
  const q = await db.collection(COL.submissionRatings).where("submissionId", "==", submissionId).get();
  let sum = 0;
  let count = 0;
  let userRating: number | null = null;
  for (const d of q.docs) {
    const data = d.data();
    const stars = data.stars as number;
    if (typeof stars === "number") {
      sum += stars;
      count += 1;
    }
    if (userId && data.userId === userId) {
      userRating = typeof stars === "number" ? stars : null;
    }
  }
  return {
    average: count > 0 ? sum / count : 0,
    count,
    userRating,
  };
}

export async function getRatingStatsBySubmissionIds(
  submissionIds: string[]
): Promise<Map<string, { average: number; count: number }>> {
  const agg = new Map<string, { sum: number; count: number }>();
  if (submissionIds.length === 0) return new Map();

  const db = getFirestoreDb();
  const chunk = 30;
  for (let i = 0; i < submissionIds.length; i += chunk) {
    const part = submissionIds.slice(i, i + chunk);
    const q = await db.collection(COL.submissionRatings).where("submissionId", "in", part).get();
    for (const d of q.docs) {
      const sid = d.data().submissionId as string;
      const stars = d.data().stars as number;
      if (typeof stars !== "number") continue;
      const cur = agg.get(sid) ?? { sum: 0, count: 0 };
      cur.sum += stars;
      cur.count += 1;
      agg.set(sid, cur);
    }
  }

  return new Map(
    [...agg.entries()].map(([id, v]) => [
      id,
      { average: v.count > 0 ? v.sum / v.count : 0, count: v.count },
    ])
  );
}

export type CommentVoteSummary = {
  upvotes: number;
  downvotes: number;
  userVote: -1 | 0 | 1;
};

export async function getCommentVoteSummary(
  commentIds: string[],
  userId?: string
): Promise<Map<string, CommentVoteSummary>> {
  const byId = new Map<string, CommentVoteSummary>();
  for (const c of commentIds) {
    byId.set(c, { upvotes: 0, downvotes: 0, userVote: 0 });
  }
  if (commentIds.length === 0) return byId;

  const db = getFirestoreDb();
  const chunk = 30;
  for (let i = 0; i < commentIds.length; i += chunk) {
    const part = commentIds.slice(i, i + chunk);
    const q = await db.collection(COL.commentVotes).where("commentId", "in", part).get();
    for (const d of q.docs) {
      const data = d.data();
      const cid = data.commentId as string;
      const value = data.value as number;
      const cur = byId.get(cid);
      if (!cur) continue;
      if (value === 1) cur.upvotes += 1;
      else if (value === -1) cur.downvotes += 1;
      if (userId && data.userId === userId) {
        cur.userVote = value === 1 ? 1 : -1;
      }
      byId.set(cid, cur);
    }
  }

  return byId;
}
