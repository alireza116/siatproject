import { FieldValue } from "firebase-admin/firestore";
import { getFirestoreDb } from "@/lib/firebase/admin";
import { COL } from "@/lib/firestore/constants";
import { asDate } from "@/lib/firestore/dates";

export type UserRole = "USER" | "GLOBAL_ADMIN";

export type UserRecord = {
  id: string;
  email?: string;
  name?: string;
  image?: string;
  sfuId?: string;
  casUsername?: string;
  googleSub?: string;
  role: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
};

function mapUser(id: string, data: FirebaseFirestore.DocumentData): UserRecord {
  return {
    id,
    email: data.email,
    name: data.name,
    image: data.image,
    sfuId: data.sfuId,
    casUsername: data.casUsername,
    googleSub: data.googleSub,
    role: data.role === "GLOBAL_ADMIN" ? "GLOBAL_ADMIN" : "USER",
    createdAt: data.createdAt ? asDate(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? asDate(data.updatedAt) : undefined,
  };
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  const db = getFirestoreDb();
  const snap = await db.collection(COL.users).doc(id).get();
  if (!snap.exists) return null;
  return mapUser(snap.id, snap.data()!);
}

export async function findUserByGoogleSub(googleSub: string): Promise<UserRecord | null> {
  const db = getFirestoreDb();
  const q = await db.collection(COL.users).where("googleSub", "==", googleSub).limit(1).get();
  if (q.empty) return null;
  const d = q.docs[0]!;
  return mapUser(d.id, d.data());
}

export async function findUserByCasUsername(casUsername: string): Promise<UserRecord | null> {
  const db = getFirestoreDb();
  const q = await db.collection(COL.users).where("casUsername", "==", casUsername).limit(1).get();
  if (q.empty) return null;
  const d = q.docs[0]!;
  return mapUser(d.id, d.data());
}

export async function findUserBySfuId(sfuId: string): Promise<UserRecord | null> {
  const db = getFirestoreDb();
  const q = await db.collection(COL.users).where("sfuId", "==", sfuId).limit(1).get();
  if (q.empty) return null;
  const d = q.docs[0]!;
  return mapUser(d.id, d.data());
}

export async function findUsersBySfuIds(sfuIds: string[]): Promise<UserRecord[]> {
  if (sfuIds.length === 0) return [];
  const db = getFirestoreDb();
  const out: UserRecord[] = [];
  const chunk = 30;
  for (let i = 0; i < sfuIds.length; i += chunk) {
    const part = sfuIds.slice(i, i + chunk);
    const q = await db.collection(COL.users).where("sfuId", "in", part).get();
    for (const d of q.docs) {
      out.push(mapUser(d.id, d.data()));
    }
  }
  return out;
}

export async function listUsersByIds(ids: string[]): Promise<UserRecord[]> {
  if (ids.length === 0) return [];
  const db = getFirestoreDb();
  const uniq = [...new Set(ids)];
  const out: UserRecord[] = [];
  const chunk = 300;
  for (let i = 0; i < uniq.length; i += chunk) {
    const refs = uniq.slice(i, i + chunk).map((id) => db.collection(COL.users).doc(id));
    const snaps = await db.getAll(...refs);
    for (const s of snaps) {
      if (s.exists) out.push(mapUser(s.id, s.data()!));
    }
  }
  return out;
}

export async function listGlobalAdmins(): Promise<UserRecord[]> {
  const db = getFirestoreDb();
  const q = await db.collection(COL.users).where("role", "==", "GLOBAL_ADMIN").get();
  return q.docs.map((d) => mapUser(d.id, d.data()));
}

export async function createUserGoogle(input: {
  googleSub: string;
  email?: string;
  name?: string;
  image?: string;
}): Promise<string> {
  const db = getFirestoreDb();
  const ref = db.collection(COL.users).doc();
  await ref.set({
    googleSub: input.googleSub,
    email: input.email ?? null,
    name: input.name ?? null,
    image: input.image ?? null,
    role: "USER",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateUserGoogle(
  userId: string,
  input: { email?: string; name?: string; image?: string }
): Promise<void> {
  const db = getFirestoreDb();
  await db
    .collection(COL.users)
    .doc(userId)
    .update({
      email: input.email ?? null,
      name: input.name ?? null,
      image: input.image ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    });
}

export async function createUserCas(input: {
  casUsername: string;
  name: string;
  sfuId?: string;
}): Promise<string> {
  const db = getFirestoreDb();
  const ref = db.collection(COL.users).doc();
  await ref.set({
    casUsername: input.casUsername,
    name: input.name,
    sfuId: input.sfuId ?? null,
    role: "USER",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateUserSfuFromCas(userId: string, sfuId: string): Promise<void> {
  const db = getFirestoreDb();
  await db.collection(COL.users).doc(userId).update({
    sfuId,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function setUserRole(userId: string, role: UserRole): Promise<void> {
  const db = getFirestoreDb();
  await db.collection(COL.users).doc(userId).update({
    role,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function updateUserSfuIdIfFree(userId: string, sfuId: string): Promise<boolean> {
  const existing = await findUserBySfuId(sfuId);
  if (existing && existing.id !== userId) return false;
  const db = getFirestoreDb();
  await db.collection(COL.users).doc(userId).update({
    sfuId,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return true;
}

export async function createUserDemo(input: {
  sfuId: string;
  casUsername: string;
  name: string;
}): Promise<string> {
  const db = getFirestoreDb();
  const ref = db.collection(COL.users).doc();
  await ref.set({
    sfuId: input.sfuId,
    casUsername: input.casUsername,
    name: input.name,
    role: "USER",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}
