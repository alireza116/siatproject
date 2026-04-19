import { FieldValue } from "firebase-admin/firestore";
import { getFirestoreDb } from "@/lib/firebase/admin";
import { COL } from "@/lib/firestore/constants";
import { asDate } from "@/lib/firestore/dates";
import type { LeanSubmissionFull } from "@/lib/types/lean";

export type SubmissionRecord = {
  id: string;
  classId: string;
  groupName: string;
  title: string;
  description?: string;
  projectUrls: string[];
  youtubeVideoIds: string[];
  authorUserIds: string[];
  authorNames: string[];
  authorSfuIds: string[];
  visibility?: "PRIVATE" | "PUBLIC";
  commentsEnabled?: boolean;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
};

export function toLeanSubmissionFull(s: SubmissionRecord): LeanSubmissionFull {
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

function mapSubmission(id: string, data: FirebaseFirestore.DocumentData): SubmissionRecord {
  return {
    id,
    classId: data.classId,
    groupName: data.groupName,
    title: data.title,
    description: data.description ?? undefined,
    projectUrls: data.projectUrls ?? [],
    youtubeVideoIds: data.youtubeVideoIds ?? [],
    authorUserIds: data.authorUserIds ?? [],
    authorNames: data.authorNames ?? [],
    authorSfuIds: data.authorSfuIds ?? [],
    visibility: data.visibility,
    commentsEnabled: data.commentsEnabled,
    createdById: data.createdById,
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
  };
}

export async function getSubmissionById(submissionId: string): Promise<SubmissionRecord | null> {
  const db = getFirestoreDb();
  const snap = await db.collection(COL.submissions).doc(submissionId).get();
  if (!snap.exists) return null;
  return mapSubmission(snap.id, snap.data()!);
}

export async function listSubmissionsByClass(classId: string): Promise<SubmissionRecord[]> {
  const db = getFirestoreDb();
  const q = await db
    .collection(COL.submissions)
    .where("classId", "==", classId)
    .orderBy("createdAt", "desc")
    .get();
  return q.docs.map((d) => mapSubmission(d.id, d.data()));
}

export async function listSubmissionsForUser(userId: string): Promise<SubmissionRecord[]> {
  const db = getFirestoreDb();
  const [createdSnap, authorSnap] = await Promise.all([
    db.collection(COL.submissions).where("createdById", "==", userId).get(),
    db.collection(COL.submissions).where("authorUserIds", "array-contains", userId).get(),
  ]);
  const byId = new Map<string, SubmissionRecord>();
  for (const d of createdSnap.docs) {
    byId.set(d.id, mapSubmission(d.id, d.data()));
  }
  for (const d of authorSnap.docs) {
    byId.set(d.id, mapSubmission(d.id, d.data()));
  }
  return [...byId.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function createSubmission(input: {
  classId: string;
  groupName: string;
  title: string;
  description?: string;
  projectUrls: string[];
  youtubeVideoIds: string[];
  authorUserIds: string[];
  authorNames: string[];
  authorSfuIds: string[];
  createdById: string;
  visibility?: "PRIVATE" | "PUBLIC";
  commentsEnabled?: boolean;
}): Promise<string> {
  const db = getFirestoreDb();
  const ref = db.collection(COL.submissions).doc();
  const payload: Record<string, unknown> = {
    classId: input.classId,
    groupName: input.groupName,
    title: input.title,
    description: input.description ?? null,
    projectUrls: input.projectUrls,
    youtubeVideoIds: input.youtubeVideoIds,
    authorUserIds: input.authorUserIds,
    authorNames: input.authorNames,
    authorSfuIds: input.authorSfuIds,
    createdById: input.createdById,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (input.visibility) payload.visibility = input.visibility;
  if (typeof input.commentsEnabled === "boolean") payload.commentsEnabled = input.commentsEnabled;
  await ref.set(payload);
  return ref.id;
}

export async function updateSubmission(
  submissionId: string,
  input: {
    title: string;
    groupName: string;
    description?: string | null;
    projectUrls: string[];
    youtubeVideoIds: string[];
    authorUserIds: string[];
    authorNames: string[];
    authorSfuIds: string[];
    visibility?: "PRIVATE" | "PUBLIC";
    commentsEnabled?: boolean;
    clearVisibility?: boolean;
    clearCommentsEnabled?: boolean;
  }
): Promise<void> {
  const db = getFirestoreDb();
  const ref = db.collection(COL.submissions).doc(submissionId);
  const payload: Record<string, unknown> = {
    title: input.title,
    groupName: input.groupName,
    description: input.description ?? null,
    projectUrls: input.projectUrls,
    youtubeVideoIds: input.youtubeVideoIds,
    authorUserIds: input.authorUserIds,
    authorNames: input.authorNames,
    authorSfuIds: input.authorSfuIds,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (input.clearVisibility) {
    payload.visibility = FieldValue.delete();
  } else if (input.visibility) {
    payload.visibility = input.visibility;
  }
  if (input.clearCommentsEnabled) {
    payload.commentsEnabled = FieldValue.delete();
  } else if (typeof input.commentsEnabled === "boolean") {
    payload.commentsEnabled = input.commentsEnabled;
  }
  await ref.update(payload);
}

export async function deleteSubmission(submissionId: string): Promise<void> {
  const db = getFirestoreDb();
  await db.collection(COL.submissions).doc(submissionId).delete();
}

export async function listSubmissionIdsForClass(classId: string): Promise<string[]> {
  const db = getFirestoreDb();
  const q = await db.collection(COL.submissions).where("classId", "==", classId).get();
  return q.docs.map((d) => d.id);
}

export async function deleteSubmissionsForClass(classId: string): Promise<void> {
  const db = getFirestoreDb();
  const q = await db.collection(COL.submissions).where("classId", "==", classId).get();
  const batch = db.batch();
  for (const d of q.docs) {
    batch.delete(d.ref);
  }
  if (!q.empty) await batch.commit();
}

export async function countSubmissionsForClass(classId: string): Promise<number> {
  const db = getFirestoreDb();
  const agg = await db.collection(COL.submissions).where("classId", "==", classId).count().get();
  return agg.data().count;
}

export async function countSubmissionsPerClass(): Promise<Map<string, number>> {
  const db = getFirestoreDb();
  const classesSnap = await db.collection(COL.classes).get();
  const entries = await Promise.all(
    classesSnap.docs.map(async (c) => {
      const n = await countSubmissionsForClass(c.id);
      return [c.id, n] as const;
    })
  );
  return new Map(entries);
}

/** All submissions (for gallery aggregation); scale by caching if needed. */
export async function listAllSubmissions(): Promise<SubmissionRecord[]> {
  const db = getFirestoreDb();
  const q = await db.collection(COL.submissions).get();
  return q.docs.map((d) => mapSubmission(d.id, d.data()));
}
