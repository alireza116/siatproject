"use server";

import { auth } from "@/auth";
import { updateUserDisplayName } from "@/lib/firestore/users";
import { revalidatePath } from "next/cache";

const MAX = 80;

export async function updateDisplayNameAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Sign in required" };
  }
  const raw = String(formData.get("displayName") ?? "");
  if (raw.length > MAX) {
    return { ok: false as const, error: `At most ${MAX} characters` };
  }

  await updateUserDisplayName(session.user.id, raw);

  revalidatePath("/account");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");

  return { ok: true as const };
}
