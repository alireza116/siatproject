"use server";

import { auth } from "@/auth";
import { dbConnect } from "@/lib/db/connect";
import { User } from "@/lib/models/User";
import { isValidSfuId, normalizeSfuId } from "@/lib/sfu-id";
import { revalidatePath } from "next/cache";

export async function updateSfuIdAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Not signed in" };
  }
  const raw = String(formData.get("sfuId") ?? "");
  if (!isValidSfuId(raw)) {
    return { ok: false as const, error: "Enter a valid SFU computing ID or 9-digit student number." };
  }
  const sfuId = normalizeSfuId(raw);
  await dbConnect();
  const existing = await User.findOne({ sfuId, _id: { $ne: session.user.id } });
  if (existing) {
    return { ok: false as const, error: "That SFU ID is already linked to another account." };
  }
  await User.findByIdAndUpdate(session.user.id, { $set: { sfuId } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}
