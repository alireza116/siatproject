import { getClassById } from "@/lib/firestore/classes";
import { getEnrollment } from "@/lib/firestore/enrollments";

export async function isClassInstructor(userId: string, classId: string): Promise<boolean> {
  const cls = await getClassById(classId);
  if (!cls) return false;
  if (cls.ownerId === userId) return true;
  const en = await getEnrollment(classId, userId);
  return en?.role === "INSTRUCTOR" || en?.role === "ASSISTANT";
}

export async function canAccessClass(userId: string, classId: string): Promise<boolean> {
  const en = await getEnrollment(classId, userId);
  if (en) return true;
  // A class owner always has access to their own class, even if the
  // INSTRUCTOR enrollment is missing for any reason.
  const cls = await getClassById(classId);
  return cls?.ownerId === userId;
}

/** Enrolled in the class, or global admin opening an existing class (for management). */
export async function canAccessClassOrGlobalAdmin(
  userId: string,
  classId: string,
  options: { isGlobalAdmin?: boolean }
): Promise<boolean> {
  if (await canAccessClass(userId, classId)) return true;
  if (options.isGlobalAdmin) {
    return !!(await getClassById(classId));
  }
  return false;
}

export type StudentSubmissionPrivileges = {
  canEditSubmissions: boolean;
  canDeleteSubmissions: boolean;
  canChangeVisibility: boolean;
};

/** Privileges for submission authoring when enrolled as STUDENT (defaults off). Instructors/assistants/owners always get full control. */
export async function getStudentSubmissionPrivileges(
  userId: string,
  classId: string
): Promise<StudentSubmissionPrivileges> {
  if (await isClassInstructor(userId, classId)) {
    return {
      canEditSubmissions: true,
      canDeleteSubmissions: true,
      canChangeVisibility: true,
    };
  }
  const en = await getEnrollment(classId, userId);
  if (!en || en.role !== "STUDENT") {
    return {
      canEditSubmissions: false,
      canDeleteSubmissions: false,
      canChangeVisibility: false,
    };
  }
  return {
    canEditSubmissions: en.studentCanEditSubmissions === true,
    canDeleteSubmissions: en.studentCanDeleteSubmissions === true,
    canChangeVisibility: en.studentCanChangeVisibility === true,
  };
}

/** Course staff or global admin (not student preview). */
export async function isClassAppManager(
  sessionUserId: string,
  classId: string,
  opts: { globalRole?: string; viewAsActive?: boolean }
): Promise<boolean> {
  if (opts.viewAsActive) return false;
  if (opts.globalRole === "GLOBAL_ADMIN") return true;
  return isClassInstructor(sessionUserId, classId);
}

export function idEq(a: string, b: string): boolean {
  return a === b;
}
