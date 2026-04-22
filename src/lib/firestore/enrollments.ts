import { FieldValue } from "firebase-admin/firestore";
import { getFirestoreDb } from "@/lib/firebase/admin";
import { COL, enrollmentDocId } from "@/lib/firestore/constants";
import { asDate } from "@/lib/firestore/dates";

export type EnrollmentRole = "STUDENT" | "ASSISTANT" | "INSTRUCTOR";

export type EnrollmentRecord = {
  id: string;
  classId: string;
  userId: string;
  role: EnrollmentRole;
  studentCanEditSubmissions: boolean;
  studentCanDeleteSubmissions: boolean;
  studentCanChangeVisibility: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function mapEnrollment(docId: string, data: FirebaseFirestore.DocumentData): EnrollmentRecord {
  return {
    id: docId,
    classId: data.classId,
    userId: data.userId,
    role: data.role as EnrollmentRole,
    studentCanEditSubmissions: data.studentCanEditSubmissions === true,
    studentCanDeleteSubmissions: data.studentCanDeleteSubmissions === true,
    studentCanChangeVisibility: data.studentCanChangeVisibility === true,
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
  };
}

export async function getEnrollment(
  classId: string,
  userId: string
): Promise<EnrollmentRecord | null> {
  const db = getFirestoreDb();
  const snap = await db.collection(COL.enrollments).doc(enrollmentDocId(classId, userId)).get();
  if (!snap.exists) return null;
  return mapEnrollment(snap.id, snap.data()!);
}

/**
 * All enrollments for a single user, newest first. We sort client-side so
 * this query does not depend on a composite (userId, createdAt) index being
 * deployed — a user is only in a handful of classes.
 */
export async function listEnrollmentsForUser(userId: string): Promise<EnrollmentRecord[]> {
  const db = getFirestoreDb();
  const q = await db
    .collection(COL.enrollments)
    .where("userId", "==", userId)
    .get();
  const rows = q.docs.map((d) => mapEnrollment(d.id, d.data()));
  rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return rows;
}

/**
 * All STUDENT enrollments for a single class, oldest first. We filter by
 * role and sort by createdAt client-side to avoid a composite index on
 * (classId, role, createdAt).
 */
export async function listStudentEnrollmentsForClass(classId: string): Promise<EnrollmentRecord[]> {
  const db = getFirestoreDb();
  const q = await db
    .collection(COL.enrollments)
    .where("classId", "==", classId)
    .get();
  const rows = q.docs
    .map((d) => mapEnrollment(d.id, d.data()))
    .filter((r) => r.role === "STUDENT");
  rows.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return rows;
}

/**
 * New students default to editing + visibility ON and delete OFF. Instructors
 * can revoke any of these later, per student or in bulk.
 */
export const DEFAULT_STUDENT_PRIVILEGES = {
  studentCanEditSubmissions: true,
  studentCanDeleteSubmissions: false,
  studentCanChangeVisibility: true,
} as const;

export async function upsertStudentEnrollment(classId: string, userId: string): Promise<void> {
  const db = getFirestoreDb();
  const id = enrollmentDocId(classId, userId);
  const ref = db.collection(COL.enrollments).doc(id);
  const snap = await ref.get();
  if (snap.exists) return;
  await ref.set({
    classId,
    userId,
    role: "STUDENT",
    ...DEFAULT_STUDENT_PRIVILEGES,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/** Create or replace a student enrollment (used when seeding demo users). */
export async function ensureStudentEnrollment(classId: string, userId: string): Promise<void> {
  const db = getFirestoreDb();
  const id = enrollmentDocId(classId, userId);
  await db
    .collection(COL.enrollments)
    .doc(id)
    .set({
      classId,
      userId,
      role: "STUDENT",
      ...DEFAULT_STUDENT_PRIVILEGES,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
}

export async function createInstructorEnrollment(classId: string, userId: string): Promise<void> {
  const db = getFirestoreDb();
  const id = enrollmentDocId(classId, userId);
  await db
    .collection(COL.enrollments)
    .doc(id)
    .set({
      classId,
      userId,
      role: "INSTRUCTOR",
      studentCanEditSubmissions: false,
      studentCanDeleteSubmissions: false,
      studentCanChangeVisibility: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
}

export async function deleteEnrollment(classId: string, userId: string): Promise<void> {
  const db = getFirestoreDb();
  await db.collection(COL.enrollments).doc(enrollmentDocId(classId, userId)).delete();
}

export async function updateStudentPrivileges(
  classId: string,
  userId: string,
  input: {
    studentCanEditSubmissions: boolean;
    studentCanDeleteSubmissions: boolean;
    studentCanChangeVisibility: boolean;
  }
): Promise<boolean> {
  const db = getFirestoreDb();
  const ref = db.collection(COL.enrollments).doc(enrollmentDocId(classId, userId));
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.role !== "STUDENT") return false;
  await ref.update({
    ...input,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return true;
}

/**
 * Apply the same privilege flags to many student enrollments at once. Silently
 * skips any target that is not a STUDENT (or does not exist). Returns the
 * number of enrollments actually updated.
 */
export async function bulkUpdateStudentPrivileges(
  classId: string,
  userIds: string[],
  input: {
    studentCanEditSubmissions: boolean;
    studentCanDeleteSubmissions: boolean;
    studentCanChangeVisibility: boolean;
  }
): Promise<number> {
  if (userIds.length === 0) return 0;
  const db = getFirestoreDb();
  const uniq = [...new Set(userIds)];
  const refs = uniq.map((uid) => db.collection(COL.enrollments).doc(enrollmentDocId(classId, uid)));
  const snaps = await db.getAll(...refs);
  const batch = db.batch();
  let n = 0;
  for (const snap of snaps) {
    if (!snap.exists) continue;
    if (snap.data()?.role !== "STUDENT") continue;
    batch.update(snap.ref, {
      ...input,
      updatedAt: FieldValue.serverTimestamp(),
    });
    n += 1;
  }
  if (n > 0) await batch.commit();
  return n;
}

export async function deleteEnrollmentsForClass(classId: string): Promise<void> {
  const db = getFirestoreDb();
  const q = await db.collection(COL.enrollments).where("classId", "==", classId).get();
  const batch = db.batch();
  for (const d of q.docs) {
    batch.delete(d.ref);
  }
  await batch.commit();
}
