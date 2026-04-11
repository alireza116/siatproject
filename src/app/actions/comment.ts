"use server";

import { auth } from "@/auth";
import { dbConnect } from "@/lib/db/connect";
import { canAccessClass, isClassInstructor } from "@/lib/class-access";
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
  const parentId = String(formData.get("parentId") ?? "").trim() || undefined;
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
  const enrolled = await canAccessClass(session.user.id, sub.classId.toString());

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

  await Comment.create({
    submissionId,
    userId: session.user.id,
    body,
    parentId: parentId || undefined,
  });

  revalidatePath(`/gallery/${submissionId}`);
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

  const instructor = await isClassInstructor(session.user.id, sub.classId.toString());
  const own = c.userId.toString() === session.user.id;
  if (!instructor && !own) {
    return { ok: false as const, error: "Not allowed" };
  }

  await Comment.deleteOne({ _id: commentId });
  revalidatePath(`/gallery/${sub._id.toString()}`);
  revalidatePath(`/classes/${sub.classId.toString()}/submissions/${sub._id.toString()}`);
  return { ok: true as const };
}
