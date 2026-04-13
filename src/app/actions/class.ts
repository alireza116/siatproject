"use server";

import { auth } from "@/auth";
import { dbConnect } from "@/lib/db/connect";
import { isClassAppManager } from "@/lib/class-access";
import { ClassModel } from "@/lib/models/Class";
import { Enrollment } from "@/lib/models/Enrollment";
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
  await dbConnect();
  const joinCode = code();
  const cls = await ClassModel.create({
    title,
    description,
    joinCode,
    ownerId: session.user.id,
  });
  await Enrollment.create({
    classId: cls._id,
    userId: session.user.id,
    role: "INSTRUCTOR",
  });
  revalidatePath("/dashboard");
  return { ok: true as const, classId: cls._id.toString() };
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
  await dbConnect();
  const cls = await ClassModel.findOne({ joinCode });
  if (!cls) {
    return { ok: false as const, error: "Class not found" };
  }
  await Enrollment.findOneAndUpdate(
    { classId: cls._id, userId: session.user.id },
    {
      $setOnInsert: {
        classId: cls._id,
        userId: session.user.id,
        role: "STUDENT",
      },
    },
    { upsert: true },
  );
  revalidatePath("/dashboard");
  revalidatePath(`/classes/${cls._id}`);
  return { ok: true as const, classId: cls._id.toString() };
}

export async function leaveClassAction(classId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Not allowed" };
  }
  await dbConnect();
  const enrollment = await Enrollment.findOne({ classId, userId: session.user.id });
  if (!enrollment) {
    return { ok: false as const, error: "Not enrolled in this class" };
  }
  if (enrollment.role === "INSTRUCTOR") {
    return { ok: false as const, error: "Instructors cannot leave a class this way. Contact the class owner." };
  }
  await Enrollment.deleteOne({ classId, userId: session.user.id });
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
  await dbConnect();
  const enrollment = await Enrollment.findOne({ classId, userId });
  if (!enrollment) {
    return { ok: false as const, error: "Enrollment not found" };
  }
  if (enrollment.role === "INSTRUCTOR") {
    return { ok: false as const, error: "Cannot remove an instructor enrollment." };
  }
  await Enrollment.deleteOne({ classId, userId });
  revalidatePath(`/classes/${classId}`);
  revalidatePath("/dashboard");
  return { ok: true as const };
}
