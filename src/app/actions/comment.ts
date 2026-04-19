"use server";

import { auth } from "@/auth";
import { canAccessClassOrGlobalAdmin, isClassAppManager } from "@/lib/class-access";
import { getClassById } from "@/lib/firestore/classes";
import {
  createComment,
  deleteComment,
  deleteCommentVotesForComment,
  findCommentBySubmissionAndUser,
  getCommentById,
  setCommentVote,
  setSubmissionRating,
  updateCommentBody,
} from "@/lib/firestore/comments";
import { getSubmissionById } from "@/lib/firestore/submissions";
import { effectiveCommentsOnPublic, effectiveVisibility } from "@/lib/visibility";
import type { LeanClass, LeanSubmission } from "@/lib/types/lean";
import { revalidatePath } from "next/cache";

function toLeanSub(s: import("@/lib/firestore/submissions").SubmissionRecord): LeanSubmission {
  return {
    _id: s.id,
    classId: s.classId,
    visibility: s.visibility,
    commentsEnabled: s.commentsEnabled,
  };
}

function toLeanCls(c: import("@/lib/firestore/classes").ClassRecord): LeanClass {
  return {
    _id: c.id,
    defaultVisibility: c.defaultVisibility,
    commentsOnPublic: c.commentsOnPublic,
  };
}

export async function addCommentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Sign in to comment" };
  }
  const submissionId = String(formData.get("submissionId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body || body.length > 8000) {
    return { ok: false as const, error: "Invalid comment" };
  }

  const subRaw = await getSubmissionById(submissionId);
  if (!subRaw) {
    return { ok: false as const, error: "Not found" };
  }
  const sub = toLeanSub(subRaw);
  const clsRaw = await getClassById(sub.classId);
  if (!clsRaw) {
    return { ok: false as const, error: "Class missing" };
  }
  const cls = toLeanCls(clsRaw);

  const vis = effectiveVisibility(sub, cls);
  const enrolled = await canAccessClassOrGlobalAdmin(session.user.id, sub.classId, {
    isGlobalAdmin: session.user.role === "GLOBAL_ADMIN",
  });

  if (vis === "PUBLIC") {
    const commentsOk = effectiveCommentsOnPublic(sub, cls);
    if (!commentsOk && !enrolled) {
      return { ok: false as const, error: "Comments are disabled for this public project" };
    }
  } else {
    if (!enrolled) {
      return { ok: false as const, error: "Not allowed" };
    }
  }

  const existing = await findCommentBySubmissionAndUser(submissionId, session.user.id);
  if (existing) {
    return { ok: false as const, error: "You can only post one comment per submission." };
  }

  try {
    await createComment({
      submissionId,
      userId: session.user.id,
      body,
    });
  } catch {
    return { ok: false as const, error: "Failed to post comment. Please try again." };
  }

  revalidatePath(`/gallery/${sub.classId}/${submissionId}`);
  revalidatePath(`/classes/${sub.classId}/submissions/${submissionId}`);
  return { ok: true as const };
}

export async function deleteCommentAction(commentId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Not allowed" };
  }
  const c = await getCommentById(commentId);
  if (!c) return { ok: false as const, error: "Not found" };
  const subRaw = await getSubmissionById(c.submissionId);
  if (!subRaw) {
    return { ok: false as const, error: "Not found" };
  }
  const sub = toLeanSub(subRaw);

  const canManage = await isClassAppManager(session.user.id, sub.classId, {
    globalRole: session.user.role,
    viewAsActive: false,
  });
  const own = c.userId === session.user.id;
  if (!canManage && !own) {
    return { ok: false as const, error: "Not allowed" };
  }

  await deleteCommentVotesForComment(commentId);
  await deleteComment(commentId);
  revalidatePath(`/gallery/${sub.classId}/${c.submissionId}`);
  revalidatePath(`/classes/${sub.classId}/submissions/${c.submissionId}`);
  return { ok: true as const };
}

export async function updateCommentAction(commentId: string, body: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Not allowed" };
  }
  const next = body.trim();
  if (!next || next.length > 8000) {
    return { ok: false as const, error: "Invalid comment" };
  }

  const c = await getCommentById(commentId);
  if (!c) return { ok: false as const, error: "Not found" };
  if (c.userId !== session.user.id) {
    return { ok: false as const, error: "You can only edit your own comment." };
  }

  await updateCommentBody(commentId, next);

  const subRaw = await getSubmissionById(c.submissionId);
  if (!subRaw) {
    return { ok: true as const };
  }
  const sub = toLeanSub(subRaw);
  revalidatePath(`/gallery/${sub.classId}/${c.submissionId}`);
  revalidatePath(`/classes/${sub.classId}/submissions/${c.submissionId}`);
  revalidatePath(`/classes/${sub.classId}`);
  return { ok: true as const };
}

export async function setCommentVoteAction(commentId: string, value: -1 | 0 | 1) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: "Sign in to vote" };
  if (![1, 0, -1].includes(value)) return { ok: false as const, error: "Invalid vote" };

  const c = await getCommentById(commentId);
  if (!c) return { ok: false as const, error: "Comment not found" };
  if (c.userId === session.user.id) {
    return { ok: false as const, error: "You cannot vote on your own comment." };
  }

  const subRaw = await getSubmissionById(c.submissionId);
  if (!subRaw) return { ok: false as const, error: "Submission not found" };
  const sub = toLeanSub(subRaw);
  const clsRaw = await getClassById(sub.classId);
  if (!clsRaw) return { ok: false as const, error: "Class missing" };
  const cls = toLeanCls(clsRaw);

  const vis = effectiveVisibility(sub, cls);
  const enrolled = await canAccessClassOrGlobalAdmin(session.user.id, sub.classId, {
    isGlobalAdmin: session.user.role === "GLOBAL_ADMIN",
  });
  if (vis === "PRIVATE" && !enrolled) return { ok: false as const, error: "Not allowed" };
  if (vis === "PUBLIC" && !effectiveCommentsOnPublic(sub, cls) && !enrolled) {
    return { ok: false as const, error: "Voting is disabled for this public project." };
  }

  await setCommentVote(commentId, session.user.id, value === 0 ? null : value);

  revalidatePath(`/gallery/${sub.classId}/${c.submissionId}`);
  revalidatePath(`/classes/${sub.classId}/submissions/${c.submissionId}`);
  return { ok: true as const };
}

export async function setSubmissionRatingAction(submissionId: string, stars: 0 | 1 | 2 | 3 | 4 | 5) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: "Sign in to rate" };
  if (![0, 1, 2, 3, 4, 5].includes(stars)) return { ok: false as const, error: "Invalid rating" };

  const subRaw = await getSubmissionById(submissionId);
  if (!subRaw) return { ok: false as const, error: "Submission not found" };
  const sub = toLeanSub(subRaw);
  const clsRaw = await getClassById(sub.classId);
  if (!clsRaw) return { ok: false as const, error: "Class missing" };
  const cls = toLeanCls(clsRaw);

  const vis = effectiveVisibility(sub, cls);
  const enrolled = await canAccessClassOrGlobalAdmin(session.user.id, sub.classId, {
    isGlobalAdmin: session.user.role === "GLOBAL_ADMIN",
  });
  if (vis === "PRIVATE" && !enrolled) return { ok: false as const, error: "Not allowed" };

  await setSubmissionRating(submissionId, session.user.id, stars === 0 ? null : stars);

  revalidatePath(`/gallery/${sub.classId}/${submissionId}`);
  revalidatePath(`/classes/${sub.classId}/submissions/${submissionId}`);
  revalidatePath(`/classes/${sub.classId}`);
  revalidatePath(`/classes/${sub.classId}/projects`);
  revalidatePath(`/gallery/${sub.classId}`);
  revalidatePath("/my-submissions");
  return { ok: true as const };
}
