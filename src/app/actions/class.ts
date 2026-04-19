"use server";

import { auth } from "@/auth";
import { isClassAppManager } from "@/lib/class-access";
import { createClass, findClassByJoinCode } from "@/lib/firestore/classes";
import { createInstructorEnrollment, deleteEnrollment, getEnrollment, upsertStudentEnrollment } from "@/lib/firestore/enrollments";
import { customAlphabet } from "nanoid";
import { revalidatePath } from "next/cache";

const code = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

export async function createClassAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || !session.user.sfuId) {
    return { ok: false as const, error: "Not allowed" };
  }
  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    return { ok: false as const, error: "Title is required" };
  }
  const description =
    String(formData.get("description") ?? "").trim() || undefined;
  if (session.user.role !== "GLOBAL_ADMIN") {
    return { ok: false as const, error: "Only admins can create a class." };
  }
  const joinCode = code();
  const classId = await createClass({
    title,
    description,
    joinCode,
    ownerId: session.user.id,
  });
  await createInstructorEnrollment(classId, session.user.id);
  revalidatePath("/dashboard");
  return { ok: true as const, classId };
}

export async function joinClassAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || !session.user.sfuId) {
    return { ok: false as const, error: "Complete SFU ID onboarding first" };
  }
  const joinCode = String(formData.get("joinCode") ?? "")
    .trim()
    .toUpperCase();
  if (!joinCode) {
    return { ok: false as const, error: "Join code is required" };
  }
  const cls = await findClassByJoinCode(joinCode);
  if (!cls) {
    return { ok: false as const, error: "Class not found" };
  }
  await upsertStudentEnrollment(cls.id, session.user.id);
  revalidatePath("/dashboard");
  revalidatePath(`/classes/${cls.id}`);
  return { ok: true as const, classId: cls.id };
}

export async function leaveClassAction(classId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Not allowed" };
  }
  const enrollment = await getEnrollment(classId, session.user.id);
  if (!enrollment) {
    return { ok: false as const, error: "Not enrolled in this class" };
  }
  if (enrollment.role === "INSTRUCTOR") {
    return { ok: false as const, error: "Instructors cannot leave a class this way. Contact the class owner." };
  }
  await deleteEnrollment(classId, session.user.id);
  revalidatePath("/dashboard");
  revalidatePath(`/classes/${classId}`);
  return { ok: true as const };
}

export async function removeStudentAction(classId: string, userId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Not allowed" };
  }
  const canManage = await isClassAppManager(session.user.id, classId, {
    globalRole: session.user.role,
    viewAsActive: false,
  });
  if (!canManage) {
    return { ok: false as const, error: "Not allowed" };
  }
  const enrollment = await getEnrollment(classId, userId);
  if (!enrollment) {
    return { ok: false as const, error: "Enrollment not found" };
  }
  if (enrollment.role === "INSTRUCTOR") {
    return { ok: false as const, error: "Cannot remove an instructor enrollment." };
  }
  await deleteEnrollment(classId, userId);
  revalidatePath(`/classes/${classId}`);
  revalidatePath("/dashboard");
  return { ok: true as const };
}
