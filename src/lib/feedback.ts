import { Types } from "mongoose";
import { CommentVote } from "@/lib/models/CommentVote";
import { SubmissionRating } from "@/lib/models/SubmissionRating";
import { leanOne } from "@/lib/mongoose-lean";

export type RatingStats = {
  average: number;
  count: number;
  userRating: number | null;
};

export async function getRatingStatsForSubmission(
  submissionId: string,
  userId?: string
): Promise<RatingStats> {
  const sid = new Types.ObjectId(submissionId);
  const agg = await SubmissionRating.aggregate<{ _id: Types.ObjectId; average: number; count: number }>([
    { $match: { submissionId: sid } },
    { $group: { _id: "$submissionId", average: { $avg: "$stars" }, count: { $sum: 1 } } },
  ]);
  const base = agg[0] ?? { average: 0, count: 0 };

  let userRating: number | null = null;
  if (userId) {
    const mineRaw = await SubmissionRating.findOne({ submissionId: sid, userId })
      .select("stars")
      .lean();
    const mine = leanOne<{ stars?: number }>(mineRaw);
    userRating = typeof mine?.stars === "number" ? mine.stars : null;
  }

  return {
    average: base.count > 0 ? base.average : 0,
    count: base.count ?? 0,
    userRating,
  };
}

export async function getRatingStatsBySubmissionIds(
  submissionIds: string[]
): Promise<Map<string, { average: number; count: number }>> {
  if (submissionIds.length === 0) return new Map();
  const ids = submissionIds.map((id) => new Types.ObjectId(id));
  const agg = await SubmissionRating.aggregate<{ _id: Types.ObjectId; average: number; count: number }>([
    { $match: { submissionId: { $in: ids } } },
    { $group: { _id: "$submissionId", average: { $avg: "$stars" }, count: { $sum: 1 } } },
  ]);
  return new Map(
    agg.map((r) => [
      r._id.toString(),
      {
        average: r.count > 0 ? r.average : 0,
        count: r.count ?? 0,
      },
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
  if (commentIds.length === 0) return new Map();
  const ids = commentIds.map((id) => new Types.ObjectId(id));
  const grouped = await CommentVote.aggregate<{
    _id: Types.ObjectId;
    upvotes: number;
    downvotes: number;
  }>([
    { $match: { commentId: { $in: ids } } },
    {
      $group: {
        _id: "$commentId",
        upvotes: { $sum: { $cond: [{ $eq: ["$value", 1] }, 1, 0] } },
        downvotes: { $sum: { $cond: [{ $eq: ["$value", -1] }, 1, 0] } },
      },
    },
  ]);

  const byId = new Map<string, CommentVoteSummary>();
  for (const c of commentIds) {
    byId.set(c, { upvotes: 0, downvotes: 0, userVote: 0 });
  }
  for (const g of grouped) {
    byId.set(g._id.toString(), {
      upvotes: g.upvotes ?? 0,
      downvotes: g.downvotes ?? 0,
      userVote: 0,
    });
  }

  if (userId) {
    const mine = await CommentVote.find({ commentId: { $in: ids }, userId })
      .select("commentId value")
      .lean();
    for (const v of mine) {
      const key = v.commentId.toString();
      const cur = byId.get(key);
      if (!cur) continue;
      cur.userVote = v.value === 1 ? 1 : -1;
      byId.set(key, cur);
    }
  }

  return byId;
}
