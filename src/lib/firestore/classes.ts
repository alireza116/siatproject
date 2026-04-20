import { FieldValue } from "firebase-admin/firestore";
import { getFirestoreDb } from "@/lib/firebase/admin";
import { COL } from "@/lib/firestore/constants";
import { asDate } from "@/lib/firestore/dates";
import type { LeanClassFull } from "@/lib/types/lean";

export type ClassRecord = {
  id: string;
  title: string;
  joinCode: string;
  description?: string;
  ownerId: string;
  defaultVisibility: "PRIVATE" | "PUBLIC";
  commentsOnPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function toLeanClassFull(c: ClassRecord): LeanClassFull {
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

function mapClass(id: string, data: FirebaseFirestore.DocumentData): ClassRecord {
  return {
    id,
    title: data.title,
    joinCode: data.joinCode,
    description: data.description,
    ownerId: data.ownerId,
    defaultVisibility: data.defaultVisibility === "PUBLIC" ? "PUBLIC" : "PRIVATE",
    commentsOnPublic: data.commentsOnPublic !== false,
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
  };
}

export async function getClassById(classId: string): Promise<ClassRecord | null> {
  const db = getFirestoreDb();
  const snap = await db.collection(COL.classes).doc(classId).get();
  if (!snap.exists) return null;
  return mapClass(snap.id, snap.data()!);
}

export async function getClassesByIds(ids: string[]): Promise<ClassRecord[]> {
  if (ids.length === 0) return [];
  const db = getFirestoreDb();
  const uniq = [...new Set(ids)];
  const out: ClassRecord[] = [];
  const chunk = 300;
  for (let i = 0; i < uniq.length; i += chunk) {
    const refs = uniq.slice(i, i + chunk).map((id) => db.collection(COL.classes).doc(id));
    const snaps = await db.getAll(...refs);
    for (const s of snaps) {
      if (s.exists) out.push(mapClass(s.id, s.data()!));
    }
  }
  return out;
}

export async function findClassByJoinCode(joinCode: string): Promise<ClassRecord | null> {
  const db = getFirestoreDb();
  const q = await db.collection(COL.classes).where("joinCode", "==", joinCode).limit(1).get();
  if (q.empty) return null;
  const d = q.docs[0]!;
  return mapClass(d.id, d.data());
}

export async function listAllClassesByTitle(): Promise<Pick<ClassRecord, "id" | "title">[]> {
  const db = getFirestoreDb();
  const q = await db.collection(COL.classes).orderBy("title").select("title").get();
  return q.docs.map((d) => ({ id: d.id, title: (d.data().title as string) ?? "" }));
}

export async function listAllClasses(): Promise<ClassRecord[]> {
  const db = getFirestoreDb();
  const q = await db.collection(COL.classes).get();
  return q.docs.map((d) => mapClass(d.id, d.data()));
}

/** All classes this user created (is the owner of), newest first. */
export async function listClassesOwnedBy(ownerId: string): Promise<ClassRecord[]> {
  const db = getFirestoreDb();
  const q = await db
    .collection(COL.classes)
    .where("ownerId", "==", ownerId)
    .orderBy("createdAt", "desc")
    .get();
  return q.docs.map((d) => mapClass(d.id, d.data()));
}

export async function createClass(input: {
  title: string;
  description?: string;
  joinCode: string;
  ownerId: string;
  defaultVisibility?: "PRIVATE" | "PUBLIC";
  commentsOnPublic?: boolean;
}): Promise<string> {
  const db = getFirestoreDb();
  const ref = db.collection(COL.classes).doc();
  await ref.set({
    title: input.title,
    description: input.description ?? null,
    joinCode: input.joinCode,
    ownerId: input.ownerId,
    defaultVisibility: input.defaultVisibility ?? "PRIVATE",
    commentsOnPublic: input.commentsOnPublic !== false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateClassSettings(
  classId: string,
  input: { defaultVisibility: "PRIVATE" | "PUBLIC"; commentsOnPublic: boolean }
): Promise<void> {
  const db = getFirestoreDb();
  await db
    .collection(COL.classes)
    .doc(classId)
    .update({
      defaultVisibility: input.defaultVisibility,
      commentsOnPublic: input.commentsOnPublic,
      updatedAt: FieldValue.serverTimestamp(),
    });
}

export async function deleteClass(classId: string): Promise<void> {
  const db = getFirestoreDb();
  await db.collection(COL.classes).doc(classId).delete();
}
