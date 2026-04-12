"use server";

import type { Types } from "mongoose";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db/connect";
import { canAccessClass, idEq, isClassInstructor } from "@/lib/class-access";
import { ClassModel } from "@/lib/models/Class";
import { Comment } from "@/lib/models/Comment";
import { Submission } from "@/lib/models/Submission";
import { User } from "@/lib/models/User";
import { extractYoutubeVideoIds, isAllowedProjectUrl } from "@/lib/youtube";
import { leanOne } from "@/lib/mongoose-lean";
import type { LeanClassFull, LeanUser } from "@/lib/types/lean";
import { revalidatePath } from "next/cache";

function parseLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function createSubmissionAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || !session.user.sfuId) {
    return { ok: false as const, error: "Not allowed" };
  }
  const classId = String(formData.get("classId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const groupName = String(formData.get("groupName") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || undefined;
  const projectUrls = parseLines(String(formData.get("projectUrls") ?? ""));
  const youtubeRaw = parseLines(String(formData.get("youtubeUrls") ?? ""));
  if (!title || !groupName) {
    return { ok: false as const, error: "Title and group name are required" };
  }
  for (const u of projectUrls) {
    if (!isAllowedProjectUrl(u)) {
      return { ok: false as const, error: `Invalid project URL: ${u}` };
    }
  }
  const youtubeVideoIds = extractYoutubeVideoIds(youtubeRaw);
  if (youtubeVideoIds.length === 0) {
    return { ok: false as const, error: "Add at least one valid YouTube URL or video ID" };
  }

  const allowed = await canAccessClass(session.user.id, classId);
  if (!allowed) {
    return { ok: false as const, error: "Not enrolled in this class" };
  }

  await dbConnect();
  const cls = leanOne<LeanClassFull>(await ClassModel.findById(classId).lean());
  if (!cls) return { ok: false as const, error: "Class not found" };

  const rawMe = await User.findById(session.user.id).lean();
  if (!rawMe || Array.isArray(rawMe)) {
    return { ok: false as const, error: "User not found" };
  }
  const me = rawMe as unknown as LeanUser;
  if (!me.sfuId) {
    return { ok: false as const, error: "SFU ID required" };
  }

  const visRaw = String(formData.get("visibility") ?? "");
  const ceRaw = String(formData.get("commentsEnabled") ?? "");
  const visibility =
    visRaw === "PUBLIC" || visRaw === "PRIVATE" ? (visRaw as "PUBLIC" | "PRIVATE") : undefined;
  const commentsEnabled =
    ceRaw === "true" || ceRaw === "false" ? ceRaw === "true" : undefined;

  let sub;
  try {
    sub = await Submission.create({
      classId,
      groupName,
      title,
      description,
      projectUrls,
      youtubeVideoIds,
      authorUserIds: [session.user.id],
      authorNames: [me.name ?? "Student"],
      authorSfuIds: [me.sfuId],
      createdById: session.user.id,
      ...(visibility ? { visibility } : {}),
      ...(typeof commentsEnabled === "boolean" ? { commentsEnabled } : {}),
    });
  } catch {
    return { ok: false as const, error: "Failed to save submission. Please try again." };
  }

  revalidatePath(`/classes/${classId}`);
  revalidatePath("/gallery");
  revalidatePath(`/gallery/${classId}`);
  return { ok: true as const, id: sub._id.toString() };
}

export async function updateSubmissionAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || !session.user.sfuId) {
    return { ok: false as const, error: "Not allowed" };
  }
  const submissionId = String(formData.get("submissionId") ?? "");
  await dbConnect();
  const sub = await Submission.findById(submissionId);
  if (!sub) return { ok: false as const, error: "Not found" };

  const instructor = await isClassInstructor(session.user.id, sub.classId.toString());
  const isAuthor =
    (sub.authorUserIds ?? []).some((id: Types.ObjectId) => idEq(id, session.user.id)) ||
    idEq(sub.createdById, session.user.id);

  if (!instructor && !isAuthor) {
    return { ok: false as const, error: "Cannot edit this submission" };
  }

  const title = String(formData.get("title") ?? "").trim();
  const groupName = String(formData.get("groupName") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || undefined;
  const projectUrls = parseLines(String(formData.get("projectUrls") ?? ""));
  const youtubeRaw = parseLines(String(formData.get("youtubeUrls") ?? ""));
  const vis = String(formData.get("visibility") ?? "");
  const ce = String(formData.get("commentsEnabled") ?? "");

  if (!title || !groupName) {
    return { ok: false as const, error: "Title and group name are required" };
  }
  for (const u of projectUrls) {
    if (!isAllowedProjectUrl(u)) {
      return { ok: false as const, error: `Invalid project URL: ${u}` };
    }
  }
  const youtubeVideoIds = extractYoutubeVideoIds(youtubeRaw);
  if (youtubeVideoIds.length === 0) {
    return { ok: false as const, error: "Add at least one valid YouTube URL or video ID" };
  }

  sub.title = title;
  sub.groupName = groupName;
  sub.description = description ?? null;
  sub.projectUrls = projectUrls;
  sub.youtubeVideoIds = youtubeVideoIds;

  if (instructor || isAuthor) {
    if (vis === "PUBLIC" || vis === "PRIVATE") {
      sub.visibility = vis;
    }
    if (ce === "true" || ce === "false") {
      sub.commentsEnabled = ce === "true";
    }
  }

  await sub.save();
  revalidatePath(`/classes/${sub.classId}`);
  revalidatePath("/gallery");
  revalidatePath(`/gallery/${sub.classId}`);
  revalidatePath(`/gallery/${sub.classId}/${submissionId}`);
  return { ok: true as const };
}

export async function deleteSubmissionAction(submissionId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Not allowed" };
  }
  await dbConnect();
  const sub = await Submission.findById(submissionId);
  if (!sub) return { ok: false as const, error: "Not found" };
  const instructor = await isClassInstructor(session.user.id, sub.classId.toString());
  if (!instructor) {
    return { ok: false as const, error: "Only instructors can delete" };
  }
  await Comment.deleteMany({ submissionId });
  await Submission.deleteOne({ _id: submissionId });
  revalidatePath(`/classes/${sub.classId}`);
  revalidatePath("/gallery");
  revalidatePath(`/gallery/${sub.classId}`);
  return { ok: true as const };
}
