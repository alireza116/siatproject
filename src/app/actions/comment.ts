"use server";

import { auth } from "@/auth";
import { dbConnect } from "@/lib/db/connect";
import { canAccessClassOrGlobalAdmin, isClassAppManager } from "@/lib/class-access";
import { ClassModel } from "@/lib/models/Class";
import { Comment } from "@/lib/models/Comment";
import { Submission } from "@/lib/models/Submission";
import { effectiveCommentsOnPublic, effectiveVisibility } from "@/lib/visibility";
import type { LeanClass, LeanSubmission } from "@/lib/types/lean";
import { revalidatePath } from "next/cache";

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

  await Comment.deleteMany({ parentId: commentId });
  await Comment.deleteOne({ _id: commentId });
  revalidatePath(`/gallery/${sub.classId.toString()}/${sub._id.toString()}`);
  revalidatePath(`/classes/${sub.classId.toString()}/submissions/${sub._id.toString()}`);
  return { ok: true as const };
}
