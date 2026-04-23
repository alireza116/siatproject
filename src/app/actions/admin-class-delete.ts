"use server";

import { auth } from "@/auth";
import { getClassById } from "@/lib/firestore/classes";
import { purgeClassAndRelatedData } from "@/lib/firestore/class-purge";
import { PERMANENT_CLASS_DELETE_PHRASE } from "@/lib/constants/class-deletion";
import { revalidatePath } from "next/cache";

export type PermanentlyDeleteClassResult =
  | { ok: true; submissionCount: number; commentCount: number }
  | { ok: false; error: string };

/**
 * Global admins only. Irreversibly deletes the class and all submissions,
 * enrollments, comments, comment votes, and star ratings tied to it.
 *
 * Requires join code + confirmation phrase verified server-side against the
 * live class document so the request cannot succeed without knowing both.
 */
export async function permanentlyDeleteClassAction(input: {
  classId: string;
  /** Must match the class join code exactly. */
  confirmationJoinCode: string;
  /** Must equal PERMANENT_CLASS_DELETE_PHRASE (see client copy). */
  confirmationPhrase: string;
}): Promise<PermanentlyDeleteClassResult> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "GLOBAL_ADMIN") {
    return { ok: false, error: "Only global administrators can delete a class." };
  }

  const classId = String(input.classId ?? "").trim();
  if (!classId) {
    return { ok: false, error: "No class selected." };
  }

  const cls = await getClassById(classId);
  if (!cls) {
    return { ok: false, error: "That class no longer exists (it may have already been deleted)." };
  }

  const codeIn = String(input.confirmationJoinCode ?? "").trim();
  const phraseIn = String(input.confirmationPhrase ?? "").trim();

  if (codeIn !== cls.joinCode) {
    return { ok: false, error: "Join code does not match this class." };
  }
  if (phraseIn !== PERMANENT_CLASS_DELETE_PHRASE) {
    return {
      ok: false,
      error: `Confirmation phrase must be exactly: ${PERMANENT_CLASS_DELETE_PHRASE}`,
    };
  }

  console.warn(
    `[class-delete] user=${session.user.id} purging class=${classId} title=${JSON.stringify(cls.title)}`,
  );

  const stats = await purgeClassAndRelatedData(classId);

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/gallery");
  revalidatePath("/my-submissions");
  revalidatePath(`/classes/${classId}`);

  return {
    ok: true,
    submissionCount: stats.submissionCount,
    commentCount: stats.commentCount,
  };
}
