"use server";

import { auth } from "@/auth";
import { isClassAppManager } from "@/lib/class-access";
import {
  DEFAULT_STUDENT_PRIVILEGES,
  bulkUpdateStudentPrivileges,
  listStudentEnrollmentsForClass,
  updateStudentPrivileges,
} from "@/lib/firestore/enrollments";
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

/**
 * Apply the given privilege flags to many students at once. If `scope=all`,
 * every current STUDENT enrollment in the class is updated. If `scope=selected`,
 * only the `studentUserIds` list is updated.
 */
export async function bulkUpdateStudentEnrollmentPrivilegesAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Not signed in" };
  }

  const classId = String(formData.get("classId") ?? "");
  const scope = String(formData.get("scope") ?? "selected");
  if (!classId) {
    return { ok: false as const, error: "Missing class" };
  }

  const canManage = await isClassAppManager(session.user.id, classId, {
    globalRole: session.user.role,
    viewAsActive: false,
  });
  if (!canManage) {
    return { ok: false as const, error: "Not allowed" };
  }

  const input = {
    studentCanEditSubmissions: flagOn(formData, "studentCanEditSubmissions"),
    studentCanDeleteSubmissions: flagOn(formData, "studentCanDeleteSubmissions"),
    studentCanChangeVisibility: flagOn(formData, "studentCanChangeVisibility"),
  };

  let targetIds: string[];
  if (scope === "all") {
    const rows = await listStudentEnrollmentsForClass(classId);
    targetIds = rows.map((r) => r.userId);
  } else {
    targetIds = formData.getAll("studentUserIds").map((v) => String(v)).filter(Boolean);
    if (targetIds.length === 0) {
      return { ok: false as const, error: "No students selected" };
    }
  }

  const updated = await bulkUpdateStudentPrivileges(classId, targetIds, input);

  revalidatePath(`/classes/${classId}`, "layout");
  revalidatePath(`/classes/${classId}/submissions/new`);
  return { ok: true as const, updated };
}

/**
 * One-click: reset every student in the class to the class defaults
 * (edit + change-visibility ON, delete OFF). Useful to bring older
 * enrollments (created when defaults were more restrictive) in line.
 */
export async function resetStudentPrivilegesToDefaultsAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Not signed in" };
  }
  const classId = String(formData.get("classId") ?? "");
  if (!classId) return { ok: false as const, error: "Missing class" };
  const canManage = await isClassAppManager(session.user.id, classId, {
    globalRole: session.user.role,
    viewAsActive: false,
  });
  if (!canManage) return { ok: false as const, error: "Not allowed" };

  const rows = await listStudentEnrollmentsForClass(classId);
  const updated = await bulkUpdateStudentPrivileges(
    classId,
    rows.map((r) => r.userId),
    { ...DEFAULT_STUDENT_PRIVILEGES }
  );

  revalidatePath(`/classes/${classId}`, "layout");
  revalidatePath(`/classes/${classId}/submissions/new`);
  return { ok: true as const, updated };
}
