"use server";

import { auth } from "@/auth";
import { isClassAppManager } from "@/lib/class-access";
import { setAllSubmissionsVisibilityInClass } from "@/lib/firestore/submissions";
import { revalidatePath } from "next/cache";

export async function setAllSubmissionsVisibilityInClassAction(
  classId: string,
  visibility: "PUBLIC" | "PRIVATE"
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Not signed in" };
  }
  if (!classId) {
    return { ok: false as const, error: "Missing class" };
  }
  if (visibility !== "PUBLIC" && visibility !== "PRIVATE") {
    return { ok: false as const, error: "Invalid visibility" };
  }

  const canManage = await isClassAppManager(session.user.id, classId, {
    globalRole: session.user.role,
    viewAsActive: false,
  });
  if (!canManage) {
    return { ok: false as const, error: "Only course staff or admins can change this" };
  }

  const updated = await setAllSubmissionsVisibilityInClass(classId, visibility);

  revalidatePath(`/classes/${classId}`, "layout");
  revalidatePath("/gallery");
  revalidatePath(`/gallery/${classId}`);
  revalidatePath("/my-submissions");

  return { ok: true as const, updated };
}
