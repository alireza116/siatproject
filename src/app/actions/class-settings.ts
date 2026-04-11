"use server";

import { auth } from "@/auth";
import { dbConnect } from "@/lib/db/connect";
import { isClassInstructor } from "@/lib/class-access";
import { ClassModel } from "@/lib/models/Class";
import { revalidatePath } from "next/cache";

export async function updateClassSettingsAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Not allowed" };
  }
  const classId = String(formData.get("classId") ?? "");
  const ok = await isClassInstructor(session.user.id, classId);
  if (!ok) {
    return { ok: false as const, error: "Only instructors can update class settings" };
  }
  const defaultVisibility = String(formData.get("defaultVisibility") ?? "");
  const commentsOnPublic = formData.get("commentsOnPublic") === "true";
  const allowGroupSubmissions = formData.get("allowGroupSubmissions") === "true";

  await dbConnect();
  const cls = await ClassModel.findById(classId);
  if (!cls) return { ok: false as const, error: "Not found" };

  if (defaultVisibility === "PUBLIC" || defaultVisibility === "PRIVATE") {
    cls.defaultVisibility = defaultVisibility;
  }
  cls.commentsOnPublic = commentsOnPublic;
  cls.allowGroupSubmissions = allowGroupSubmissions;
  await cls.save();

  revalidatePath(`/classes/${classId}`);
  revalidatePath("/gallery");
  return { ok: true as const };
}
