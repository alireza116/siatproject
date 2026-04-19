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

export async function listEnrollmentsForUser(userId: string): Promise<EnrollmentRecord[]> {
  const db = getFirestoreDb();
  const q = await db
    .collection(COL.enrollments)
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();
  return q.docs.map((d) => mapEnrollment(d.id, d.data()));
}

export async function listStudentEnrollmentsForClass(classId: string): Promise<EnrollmentRecord[]> {
  const db = getFirestoreDb();
  const q = await db
    .collection(COL.enrollments)
    .where("classId", "==", classId)
    .where("role", "==", "STUDENT")
    .orderBy("createdAt", "asc")
    .get();
  return q.docs.map((d) => mapEnrollment(d.id, d.data()));
}

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
    studentCanEditSubmissions: false,
    studentCanDeleteSubmissions: false,
    studentCanChangeVisibility: false,
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
      studentCanEditSubmissions: false,
      studentCanDeleteSubmissions: false,
      studentCanChangeVisibility: false,
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

export async function deleteEnrollmentsForClass(classId: string): Promise<void> {
  const db = getFirestoreDb();
  const q = await db.collection(COL.enrollments).where("classId", "==", classId).get();
  const batch = db.batch();
  for (const d of q.docs) {
    batch.delete(d.ref);
  }
  await batch.commit();
}
