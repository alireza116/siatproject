import type { Types } from "mongoose";
import { dbConnect } from "@/lib/db/connect";
import { ClassModel } from "@/lib/models/Class";
import { Enrollment } from "@/lib/models/Enrollment";
import { leanOne } from "@/lib/mongoose-lean";
import type { LeanClassFull, LeanEnrollment } from "@/lib/types/lean";

export async function getEnrollment(userId: string, classId: string) {
  await dbConnect();
  return Enrollment.findOne({ userId, classId }).lean();
}

export async function isClassInstructor(userId: string, classId: string): Promise<boolean> {
  await dbConnect();
  const cls = leanOne<LeanClassFull>(await ClassModel.findById(classId).lean());
  if (!cls) return false;
  if (cls.ownerId.toString() === userId) return true;
  const rawEn = await Enrollment.findOne({ classId, userId }).lean();
  const en = leanOne<LeanEnrollment>(rawEn);
  return en?.role === "INSTRUCTOR" || en?.role === "ASSISTANT";
}

export async function canAccessClass(userId: string, classId: string): Promise<boolean> {
  await dbConnect();
  const en = await Enrollment.findOne({ classId, userId }).lean();
  return !!en;
}

/** Enrolled in the class, or global admin opening an existing class (for management). */
export async function canAccessClassOrGlobalAdmin(
  userId: string,
  classId: string,
  options: { isGlobalAdmin?: boolean }
): Promise<boolean> {
  if (await canAccessClass(userId, classId)) return true;
  if (options.isGlobalAdmin) {
    await dbConnect();
    return !!(await ClassModel.findById(classId).lean());
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
  await dbConnect();
  if (await isClassInstructor(userId, classId)) {
    return {
      canEditSubmissions: true,
      canDeleteSubmissions: true,
      canChangeVisibility: true,
    };
  }
  const raw = await Enrollment.findOne({ classId, userId }).lean();
  const en = leanOne<LeanEnrollment>(raw);
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

export function idEq(a: string | Types.ObjectId, b: string | Types.ObjectId): boolean {
  return a.toString() === b.toString();
}
