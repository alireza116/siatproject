"use server";

import { auth } from "@/auth";
import { dbConnect } from "@/lib/db/connect";
import { canAccessClassOrGlobalAdmin, isClassAppManager } from "@/lib/class-access";
import { ClassModel } from "@/lib/models/Class";
import { Comment } from "@/lib/models/Comment";
import { CommentVote } from "@/lib/models/CommentVote";
import { Submission } from "@/lib/models/Submission";
import { SubmissionRating } from "@/lib/models/SubmissionRating";
import { effectiveCommentsOnPublic, effectiveVisibility } from "@/lib/visibility";
import type { LeanClass, LeanSubmission } from "@/lib/types/lean";
import { revalidatePath } from "next/cache";
import { leanOne } from "@/lib/mongoose-lean";

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

  await dbConnect();
  const rawSub = await Submission.findById(submissionId).lean();
  if (!rawSub || Array.isArray(rawSub)) {
    return { ok: false as const, error: "Not found" };
  }
  const sub = rawSub as unknown as LeanSubmission;
  const rawCls = await ClassModel.findById(sub.classId).lean();
  if (!rawCls || Array.isArray(rawCls)) {
    return { ok: false as const, error: "Class missing" };
  }
  const cls = rawCls as unknown as LeanClass;

  const vis = effectiveVisibility(sub, cls);
  const enrolled = await canAccessClassOrGlobalAdmin(session.user.id, sub.classId.toString(), {
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

  const existing = await Comment.findOne({ submissionId, userId: session.user.id }).lean();
  if (existing) {
    return { ok: false as const, error: "You can only post one comment per submission." };
  }

  try {
    await Comment.create({
      submissionId,
      userId: session.user.id,
      body,
    });
  } catch {
    return { ok: false as const, error: "Failed to post comment. Please try again." };
  }

  revalidatePath(`/gallery/${sub.classId.toString()}/${submissionId}`);
  revalidatePath(`/classes/${sub.classId.toString()}/submissions/${submissionId}`);
  return { ok: true as const };
}

export async function deleteCommentAction(commentId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Not allowed" };
  }
  await dbConnect();
  const c = await Comment.findById(commentId);
  if (!c) return { ok: false as const, error: "Not found" };
  const rawSub = await Submission.findById(c.submissionId).lean();
  if (!rawSub || Array.isArray(rawSub)) {
    return { ok: false as const, error: "Not found" };
  }
  const sub = rawSub as unknown as LeanSubmission;

  const canManage = await isClassAppManager(session.user.id, sub.classId.toString(), {
    globalRole: session.user.role,
    viewAsActive: false,
  });
  const own = c.userId.toString() === session.user.id;
  if (!canManage && !own) {
    return { ok: false as const, error: "Not allowed" };
  }

  await CommentVote.deleteMany({ commentId });
  await Comment.deleteOne({ _id: commentId });
  revalidatePath(`/gallery/${sub.classId.toString()}/${sub._id.toString()}`);
  revalidatePath(`/classes/${sub.classId.toString()}/submissions/${sub._id.toString()}`);
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

  await dbConnect();
  const c = await Comment.findById(commentId);
  if (!c) return { ok: false as const, error: "Not found" };
  if (c.userId.toString() !== session.user.id) {
    return { ok: false as const, error: "You can only edit your own comment." };
  }

  c.body = next;
  await c.save();

  const rawSub = await Submission.findById(c.submissionId).lean();
  if (!rawSub || Array.isArray(rawSub)) {
    return { ok: true as const };
  }
  const sub = rawSub as unknown as LeanSubmission;
  revalidatePath(`/gallery/${sub.classId.toString()}/${sub._id.toString()}`);
  revalidatePath(`/classes/${sub.classId.toString()}/submissions/${sub._id.toString()}`);
  return { ok: true as const };
}

export async function setCommentVoteAction(commentId: string, value: -1 | 0 | 1) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: "Sign in to vote" };
  if (![1, 0, -1].includes(value)) return { ok: false as const, error: "Invalid vote" };

  await dbConnect();
  const cRaw = await Comment.findById(commentId).lean();
  const c = leanOne<{ userId: { toString(): string }; submissionId: { toString(): string } }>(cRaw);
  if (!c) return { ok: false as const, error: "Comment not found" };
  if (c.userId.toString() === session.user.id) {
    return { ok: false as const, error: "You cannot vote on your own comment." };
  }

  const rawSub = await Submission.findById(c.submissionId.toString()).lean();
  if (!rawSub || Array.isArray(rawSub)) return { ok: false as const, error: "Submission not found" };
  const sub = rawSub as unknown as LeanSubmission;
  const rawCls = await ClassModel.findById(sub.classId).lean();
  if (!rawCls || Array.isArray(rawCls)) return { ok: false as const, error: "Class missing" };
  const cls = rawCls as unknown as LeanClass;

  const vis = effectiveVisibility(sub, cls);
  const enrolled = await canAccessClassOrGlobalAdmin(session.user.id, sub.classId.toString(), {
    isGlobalAdmin: session.user.role === "GLOBAL_ADMIN",
  });
  if (vis === "PRIVATE" && !enrolled) return { ok: false as const, error: "Not allowed" };
  if (vis === "PUBLIC" && !effectiveCommentsOnPublic(sub, cls) && !enrolled) {
    return { ok: false as const, error: "Voting is disabled for this public project." };
  }

  if (value === 0) {
    await CommentVote.deleteOne({ commentId, userId: session.user.id });
  } else {
    await CommentVote.updateOne(
      { commentId, userId: session.user.id },
      { $set: { value } },
      { upsert: true }
    );
  }

  revalidatePath(`/gallery/${sub.classId.toString()}/${sub._id.toString()}`);
  revalidatePath(`/classes/${sub.classId.toString()}/submissions/${sub._id.toString()}`);
  return { ok: true as const };
}

export async function setSubmissionRatingAction(submissionId: string, stars: 0 | 1 | 2 | 3 | 4 | 5) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: "Sign in to rate" };
  if (![0, 1, 2, 3, 4, 5].includes(stars)) return { ok: false as const, error: "Invalid rating" };

  await dbConnect();
  const rawSub = await Submission.findById(submissionId).lean();
  if (!rawSub || Array.isArray(rawSub)) return { ok: false as const, error: "Submission not found" };
  const sub = rawSub as unknown as LeanSubmission;
  const rawCls = await ClassModel.findById(sub.classId).lean();
  if (!rawCls || Array.isArray(rawCls)) return { ok: false as const, error: "Class missing" };
  const cls = rawCls as unknown as LeanClass;

  const vis = effectiveVisibility(sub, cls);
  const enrolled = await canAccessClassOrGlobalAdmin(session.user.id, sub.classId.toString(), {
    isGlobalAdmin: session.user.role === "GLOBAL_ADMIN",
  });
  if (vis === "PRIVATE" && !enrolled) return { ok: false as const, error: "Not allowed" };

  if (stars === 0) {
    await SubmissionRating.deleteOne({ submissionId, userId: session.user.id });
  } else {
    await SubmissionRating.updateOne(
      { submissionId, userId: session.user.id },
      { $set: { stars } },
      { upsert: true }
    );
  }

  revalidatePath(`/gallery/${sub.classId.toString()}/${submissionId}`);
  revalidatePath(`/classes/${sub.classId.toString()}/submissions/${submissionId}`);
  revalidatePath(`/classes/${sub.classId.toString()}`);
  revalidatePath(`/classes/${sub.classId.toString()}/projects`);
  revalidatePath(`/gallery/${sub.classId.toString()}`);
  revalidatePath("/my-submissions");
  return { ok: true as const };
}
