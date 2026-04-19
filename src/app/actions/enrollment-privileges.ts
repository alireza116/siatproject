"use server";

import { auth } from "@/auth";
import { isClassAppManager } from "@/lib/class-access";
import { updateStudentPrivileges } from "@/lib/firestore/enrollments";
import { revalidatePath } from "next/cache";

function flagOn(formData: FormData, name: string): boolean {
  return formData.get(name) === "on";
}

export async function updateStudentEnrollmentPrivilegesAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Not signed in" };
  }

  const classId = String(formData.get("classId") ?? "");
  const studentUserId = String(formData.get("studentUserId") ?? "");
  if (!classId || !studentUserId) {
    return { ok: false as const, error: "Missing class or student" };
  }

  const canManage = await isClassAppManager(session.user.id, classId, {
    globalRole: session.user.role,
    viewAsActive: false,
  });
  if (!canManage) {
    return { ok: false as const, error: "Not allowed" };
  }

  const ok = await updateStudentPrivileges(classId, studentUserId, {
    studentCanEditSubmissions: flagOn(formData, "studentCanEditSubmissions"),
    studentCanDeleteSubmissions: flagOn(formData, "studentCanDeleteSubmissions"),
    studentCanChangeVisibility: flagOn(formData, "studentCanChangeVisibility"),
  });
  if (!ok) {
    return { ok: false as const, error: "Student enrollment not found" };
  }

  revalidatePath(`/classes/${classId}`, "layout");
  revalidatePath(`/classes/${classId}/submissions/new`);
  return { ok: true as const };
}
