import { getClassById, listAllClasses } from "@/lib/firestore/classes";
import {
  getSubmissionById,
  listAllSubmissions,
  listSubmissionsByClass,
  type SubmissionRecord,
} from "@/lib/firestore/submissions";
import { effectiveVisibility } from "@/lib/visibility";
import type { LeanClassFull, LeanSubmissionFull } from "@/lib/types/lean";

export type PublicSubmissionListItem = {
  _id: string;
  title: string;
  groupName: string;
  classTitle: string;
  firstYoutubeId?: string;
  createdAt: Date;
};

export type PublicClassListItem = {
  _id: string;
  title: string;
  description?: string;
  publicCount: number;
};

function toLeanFull(s: SubmissionRecord): LeanSubmissionFull {
  return {
    _id: s.id,
    classId: s.classId,
    visibility: s.visibility,
    commentsEnabled: s.commentsEnabled,
    title: s.title,
    groupName: s.groupName,
    description: s.description,
    projectUrls: s.projectUrls,
    youtubeVideoIds: s.youtubeVideoIds,
    authorUserIds: s.authorUserIds,
    authorNames: s.authorNames,
    authorSfuIds: s.authorSfuIds,
    createdById: s.createdById,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

function toLeanClass(c: import("@/lib/firestore/classes").ClassRecord): LeanClassFull {
  return {
    _id: c.id,
    title: c.title,
    joinCode: c.joinCode,
    description: c.description,
    ownerId: c.ownerId,
    defaultVisibility: c.defaultVisibility,
    commentsOnPublic: c.commentsOnPublic,
  };
}

function submissionIsPublic(s: LeanSubmissionFull, cls: LeanClassFull): boolean {
  return effectiveVisibility(s, cls) === "PUBLIC";
}

/** List all classes that have at least one publicly visible submission. */
export async function listClassesWithPublicSubmissions(): Promise<PublicClassListItem[]> {
  const [allSubs, allClasses] = await Promise.all([listAllSubmissions(), listAllClasses()]);
  const classMap = new Map(allClasses.map((c) => [c.id, toLeanClass(c)]));
  const byClassPublic = new Map<string, { count: number; title: string; description?: string }>();

  for (const s of allSubs) {
    const cls = classMap.get(s.classId);
    if (!cls) continue;
    if (!submissionIsPublic(toLeanFull(s), cls)) continue;
    const cur = byClassPublic.get(s.classId);
    if (cur) {
      cur.count += 1;
    } else {
      byClassPublic.set(s.classId, {
        count: 1,
        title: cls.title,
        description: cls.description,
      });
    }
  }

  return [...byClassPublic.entries()]
    .map(([classId, v]) => ({
      _id: classId,
      title: v.title,
      description: v.description,
      publicCount: v.count,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

/** List all publicly visible submissions for a single class. */
export async function listPublicSubmissionsForClass(
  classId: string
): Promise<PublicSubmissionListItem[]> {
  const clsRaw = await getClassById(classId);
  if (!clsRaw) return [];
  const cls = toLeanClass(clsRaw);

  const subs = await listSubmissionsByClass(classId);
  return subs
    .map((s) => toLeanFull(s))
    .filter((s) => submissionIsPublic(s, cls))
    .map((s) => ({
      _id: s._id,
      title: s.title,
      groupName: s.groupName,
      classTitle: cls.title,
      firstYoutubeId: s.youtubeVideoIds?.[0],
      createdAt: s.createdAt,
    }));
}

/** Fetch a single submission, verifying it belongs to classId and is publicly visible. */
export async function getPublicSubmission(
  classId: string,
  submissionId: string
): Promise<{ submission: LeanSubmissionFull; class: LeanClassFull } | null> {
  const sRaw = await getSubmissionById(submissionId);
  if (!sRaw || sRaw.classId !== classId) return null;
  const clsRaw = await getClassById(classId);
  if (!clsRaw) return null;
  const s = toLeanFull(sRaw);
  const cls = toLeanClass(clsRaw);
  if (effectiveVisibility(s, cls) !== "PUBLIC") return null;
  return { submission: s, class: cls };
}
