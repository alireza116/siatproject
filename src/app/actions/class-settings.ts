"use server";

import { auth } from "@/auth";
import { isClassAppManager } from "@/lib/class-access";
import { getClassById, updateClassSettings } from "@/lib/firestore/classes";
import { revalidatePath } from "next/cache";

export async function updateClassSettingsAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Not allowed" };
  }
  const classId = String(formData.get("classId") ?? "");
  const ok = await isClassAppManager(session.user.id, classId, {
    globalRole: session.user.role,
    viewAsActive: false,
  });
  if (!ok) {
    return { ok: false as const, error: "Only course staff or admins can update class settings" };
  }
  const defaultVisibility = String(formData.get("defaultVisibility") ?? "");
  const commentsOnPublic = formData.get("commentsOnPublic") === "true";
  const publicShowGroupName = formData.get("publicShowGroupName") === "true";
  const publicShowAuthorNames = formData.get("publicShowAuthorNames") === "true";
  const publicShowAuthorSfuIds = formData.get("publicShowAuthorSfuIds") === "true";

  const cls = await getClassById(classId);
  if (!cls) return { ok: false as const, error: "Not found" };

  let vis: "PRIVATE" | "PUBLIC" = cls.defaultVisibility;
  if (defaultVisibility === "PUBLIC" || defaultVisibility === "PRIVATE") {
    vis = defaultVisibility;
  }
  await updateClassSettings(classId, {
    defaultVisibility: vis,
    commentsOnPublic,
    publicShowGroupName,
    publicShowAuthorNames,
    publicShowAuthorSfuIds,
  });

  revalidatePath(`/classes/${classId}`);
  revalidatePath("/gallery");
  return { ok: true as const };
}
