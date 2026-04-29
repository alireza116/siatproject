import { auth } from "@/auth";
import { listCommentsForSubmission } from "@/lib/firestore/comments";
import { listUsersByIds } from "@/lib/firestore/users";
import {
  getPublicSubmission,
  listPublicSubmissionsForClass,
} from "@/lib/gallery";
import type { LeanClassFull, LeanSubmissionFull } from "@/lib/types/lean";
import type { CommentRow } from "@/components/CommentsBlock";
import { isClassInstructor } from "@/lib/class-access";
import { effectiveCommentsOnPublic, effectiveVisibility } from "@/lib/visibility";
import { getCommentVoteSummary, getRatingStatsForSubmission } from "@/lib/feedback";
import { appDisplayLabelFromRecord } from "@/lib/display-name";
import type { LeanComment } from "@/lib/types/lean";

export type PublicSubmissionPagePayload = {
  classId: string;
  submissionId: string;
  data: { submission: LeanSubmissionFull; class: LeanClassFull };
  commentRows: CommentRow[];
  hasOwnComment: boolean;
  vis: ReturnType<typeof effectiveVisibility>;
  commentsOk: boolean;
  rating: { average: number; count: number; userRating: number | null };
  isInstructor: boolean;
  sessionUserId: string | undefined;
  prevNavSub: { _id: string; title: string } | null;
  nextNavSub: { _id: string; title: string } | null;
  navIndex: number;
  totalPublic: number;
};

export async function loadPublicSubmissionPageData(
  classId: string,
  submissionId: string
): Promise<PublicSubmissionPagePayload | null> {
  const data = await getPublicSubmission(classId, submissionId);
  if (!data) return null;

  const { submission: sub, class: cls } = data;
  const session = await auth();

  const commentsRaw = await listCommentsForSubmission(submissionId);
  const comments: LeanComment[] = commentsRaw.map((c) => ({
    _id: c.id,
    userId: c.userId,
    body: c.body,
    createdAt: c.createdAt,
  }));
  const hasOwnComment = !!session?.user?.id && comments.some((c) => c.userId === session.user.id);
  const commentIds = comments.map((c) => c._id);
  const voteSummary = await getCommentVoteSummary(commentIds, session?.user?.id);
  const userIds = [...new Set(comments.map((c) => c.userId))];
  const users = await listUsersByIds(userIds);
  const userMap = new Map(users.map((u) => [u.id, u]));

  const vis = effectiveVisibility(sub, cls);
  const commentsOk = effectiveCommentsOnPublic(sub, cls);
  const rating = await getRatingStatsForSubmission(submissionId, session?.user?.id);

  let isInstructor = false;
  if (session?.user?.id) {
    isInstructor = await isClassInstructor(session.user.id, cls._id);
  }

  const allPublicSubs = await listPublicSubmissionsForClass(classId);
  const navIndex = allPublicSubs.findIndex((s) => s._id === submissionId);
  const prevNavSub = navIndex > 0 ? allPublicSubs[navIndex - 1]! : null;
  const nextNavSub = navIndex < allPublicSubs.length - 1 ? allPublicSubs[navIndex + 1]! : null;

  const commentRows: CommentRow[] = comments.map((c) => {
    const u = userMap.get(c.userId);
    return {
      id: c._id,
      body: c.body,
      createdAt: c.createdAt?.toISOString() ?? "",
      userId: c.userId,
      upvotes: voteSummary.get(c._id)?.upvotes ?? 0,
      downvotes: voteSummary.get(c._id)?.downvotes ?? 0,
      userVote: (voteSummary.get(c._id)?.userVote ?? 0) as -1 | 0 | 1,
      userLabel: u ? appDisplayLabelFromRecord(u) : "User",
    };
  });

  return {
    classId,
    submissionId,
    data,
    commentRows,
    hasOwnComment,
    vis,
    commentsOk,
    rating,
    isInstructor,
    sessionUserId: session?.user?.id,
    prevNavSub: prevNavSub ? { _id: prevNavSub._id, title: prevNavSub.title } : null,
    nextNavSub: nextNavSub ? { _id: nextNavSub._id, title: nextNavSub.title } : null,
    navIndex: navIndex >= 0 ? navIndex : 0,
    totalPublic: allPublicSubs.length,
  };
}
