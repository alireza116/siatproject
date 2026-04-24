"use server";

import { auth } from "@/auth";
import {
  canAccessClass,
  getStudentSubmissionPrivileges,
  idEq,
  isClassAppManager,
} from "@/lib/class-access";
import {
  deleteAllCommentsForSubmission,
  deleteCommentVotesForCommentIds,
  deleteSubmissionRatingsForSubmission,
  listCommentIdsForSubmission,
} from "@/lib/firestore/comments";
import { getClassById } from "@/lib/firestore/classes";
import {
  createSubmission,
  deleteSubmission,
  getSubmissionById,
  updateSubmission,
} from "@/lib/firestore/submissions";
import { findUsersBySfuIds, getUserById } from "@/lib/firestore/users";
import { appDisplayLabel } from "@/lib/display-name";
import { extractYoutubeVideoIds, isAllowedProjectUrl } from "@/lib/youtube";
import type { LeanUser } from "@/lib/types/lean";
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

  const enrolled = await canAccessClass(session.user.id, classId);
  const classManager = await isClassAppManager(session.user.id, classId, {
    globalRole: session.user.role,
    viewAsActive: false,
  });
  if (!enrolled && !classManager) {
    return { ok: false as const, error: "Not enrolled in this class" };
  }

  const clsRaw = await getClassById(classId);
  if (!clsRaw) return { ok: false as const, error: "Class not found" };

  const me = await getUserById(session.user.id);
  if (!me) {
    return { ok: false as const, error: "User not found" };
  }
  const leanMe: LeanUser = {
    _id: me.id,
    sfuId: me.sfuId,
    name: me.name,
    email: me.email,
    image: me.image,
    role: me.role,
  };
  if (!leanMe.sfuId) {
    return { ok: false as const, error: "SFU ID required" };
  }

  const visRaw = String(formData.get("visibility") ?? "");
  const ceRaw = String(formData.get("commentsEnabled") ?? "");
  let visibility =
    visRaw === "PUBLIC" || visRaw === "PRIVATE" ? (visRaw as "PUBLIC" | "PRIVATE") : undefined;
  let commentsEnabled =
    ceRaw === "true" || ceRaw === "false" ? ceRaw === "true" : undefined;

  if (!classManager) {
    const p = await getStudentSubmissionPrivileges(session.user.id, classId);
    if (!p.canChangeVisibility) {
      visibility = undefined;
      commentsEnabled = undefined;
    }
  }

  const coauthorRaw = parseLines(String(formData.get("coauthorSfuIds") ?? ""));
  const coauthorSfuIds = [...new Set(coauthorRaw.filter((id) => id !== leanMe.sfuId))];
  const coauthorUsers = coauthorSfuIds.length > 0 ? await findUsersBySfuIds(coauthorSfuIds) : [];
  const coauthorUserMap = new Map(coauthorUsers.map((u) => [u.sfuId!, u]));

  const authorUserIds: string[] = [session.user.id];
  const authorNames: string[] = [
    appDisplayLabel({ displayName: me.displayName, sfuId: me.sfuId, name: me.name }),
  ];
  const authorSfuIds: string[] = [leanMe.sfuId];
  for (const sfuId of coauthorSfuIds) {
    const u = coauthorUserMap.get(sfuId);
    if (u?.id) authorUserIds.push(u.id);
    authorNames.push(
      appDisplayLabel({ displayName: u?.displayName, sfuId: u?.sfuId ?? sfuId, name: u?.name }),
    );
    authorSfuIds.push(sfuId);
  }

  let id: string;
  try {
    id = await createSubmission({
      classId,
      groupName,
      title,
      description,
      projectUrls,
      youtubeVideoIds,
      authorUserIds,
      authorNames,
      authorSfuIds,
      createdById: session.user.id,
      ...(visibility ? { visibility } : {}),
      ...(typeof commentsEnabled === "boolean" ? { commentsEnabled } : {}),
    });
  } catch {
    return { ok: false as const, error: "Failed to save submission. Please try again." };
  }

  revalidatePath(`/classes/${classId}`);
  revalidatePath("/my-submissions");
  revalidatePath("/gallery");
  revalidatePath(`/gallery/${classId}`);
  return { ok: true as const, id };
}

export async function updateSubmissionAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || !session.user.sfuId) {
    return { ok: false as const, error: "Not allowed" };
  }
  const submissionId = String(formData.get("submissionId") ?? "");
  const sub = await getSubmissionById(submissionId);
  if (!sub) return { ok: false as const, error: "Not found" };

  const classIdStr = sub.classId;
  const classManager = await isClassAppManager(session.user.id, classIdStr, {
    globalRole: session.user.role,
    viewAsActive: false,
  });
  const isAuthor =
    (sub.authorUserIds ?? []).some((id) => idEq(id, session.user.id)) ||
    idEq(sub.createdById, session.user.id);

  if (!classManager && !isAuthor) {
    return { ok: false as const, error: "Cannot edit this submission" };
  }

  let canChangeVisibility = false;
  if (classManager) {
    canChangeVisibility = true;
  } else if (isAuthor) {
    const p = await getStudentSubmissionPrivileges(session.user.id, classIdStr);
    if (!p.canEditSubmissions) {
      return { ok: false as const, error: "Editing is disabled for your account in this class." };
    }
    canChangeVisibility = p.canChangeVisibility;
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

  const creatorDoc = await getUserById(sub.createdById);
  const creatorLean: LeanUser | null = creatorDoc
    ? {
        _id: creatorDoc.id,
        sfuId: creatorDoc.sfuId,
        name: creatorDoc.name,
        email: creatorDoc.email,
        image: creatorDoc.image,
        role: creatorDoc.role,
      }
    : null;
  const coauthorRaw = parseLines(String(formData.get("coauthorSfuIds") ?? ""));
  const coauthorSfuIds = [...new Set(coauthorRaw.filter((id) => id !== creatorLean?.sfuId))];
  const coauthorUsers = coauthorSfuIds.length > 0 ? await findUsersBySfuIds(coauthorSfuIds) : [];
  const coauthorUserMap = new Map(coauthorUsers.map((u) => [u.sfuId!, u]));

  const newAuthorUserIds: string[] = [sub.createdById];
  const newAuthorNames: string[] = [
    creatorDoc
      ? appDisplayLabel({
          displayName: creatorDoc.displayName,
          sfuId: creatorDoc.sfuId,
          name: creatorDoc.name,
        })
      : sub.authorNames[0] ?? "Student",
  ];
  const newAuthorSfuIds: string[] = [creatorLean?.sfuId ?? sub.authorSfuIds[0] ?? ""];
  for (const sfuId of coauthorSfuIds) {
    const u = coauthorUserMap.get(sfuId);
    if (u?.id) newAuthorUserIds.push(u.id);
    newAuthorNames.push(
      appDisplayLabel({ displayName: u?.displayName, sfuId: u?.sfuId ?? sfuId, name: u?.name }),
    );
    newAuthorSfuIds.push(sfuId);
  }

  let visibility: "PRIVATE" | "PUBLIC" | undefined;
  let commentsEnabled: boolean | undefined;
  if (canChangeVisibility) {
    if (vis === "PUBLIC" || vis === "PRIVATE") {
      visibility = vis;
    }
    if (ce === "true" || ce === "false") {
      commentsEnabled = ce === "true";
    }
  }

  await updateSubmission(submissionId, {
    title,
    groupName,
    description: description ?? null,
    projectUrls,
    youtubeVideoIds,
    authorUserIds: newAuthorUserIds,
    authorNames: newAuthorNames,
    authorSfuIds: newAuthorSfuIds,
    visibility,
    commentsEnabled,
  });

  revalidatePath(`/classes/${sub.classId}`);
  revalidatePath("/my-submissions");
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
  const sub = await getSubmissionById(submissionId);
  if (!sub) return { ok: false as const, error: "Not found" };
  const classIdStr = sub.classId;
  const classManager = await isClassAppManager(session.user.id, classIdStr, {
    globalRole: session.user.role,
    viewAsActive: false,
  });
  const isAuthor =
    (sub.authorUserIds ?? []).some((id) => idEq(id, session.user.id)) ||
    idEq(sub.createdById, session.user.id);

  if (!classManager) {
    if (!isAuthor) {
      return { ok: false as const, error: "Not allowed" };
    }
    const p = await getStudentSubmissionPrivileges(session.user.id, classIdStr);
    if (!p.canDeleteSubmissions) {
      return { ok: false as const, error: "Deleting your submissions is disabled for this class." };
    }
  }
  const commentIds = await listCommentIdsForSubmission(submissionId);
  await deleteCommentVotesForCommentIds(commentIds);
  await deleteSubmissionRatingsForSubmission(submissionId);
  await deleteAllCommentsForSubmission(submissionId);
  await deleteSubmission(submissionId);
  revalidatePath(`/classes/${sub.classId}`);
  revalidatePath("/my-submissions");
  revalidatePath("/gallery");
  revalidatePath(`/gallery/${sub.classId}`);
  return { ok: true as const };
}
