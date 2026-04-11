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

export function idEq(a: string | Types.ObjectId, b: string | Types.ObjectId): boolean {
  return a.toString() === b.toString();
}
