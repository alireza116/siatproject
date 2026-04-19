"use server";

import { auth } from "@/auth";
import { findUserBySfuId, setUserRole } from "@/lib/firestore/users";
import { getBootstrapAdminIds } from "@/lib/admin";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "GLOBAL_ADMIN") {
    throw new Error("Not allowed");
  }
  return session;
}

export async function grantAdminAction(formData: FormData) {
  await requireAdmin();
  const sfuId = String(formData.get("sfuId") ?? "").trim().toLowerCase();
  if (!sfuId) return { ok: false as const, error: "SFU ID is required" };

  const user = await findUserBySfuId(sfuId);
  if (!user) {
    return { ok: false as const, error: `No user found with SFU ID "${sfuId}". They must sign in at least once first.` };
  }
  if (user.role === "GLOBAL_ADMIN") {
    return { ok: false as const, error: `${sfuId} is already an admin.` };
  }
  await setUserRole(user.id, "GLOBAL_ADMIN");
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function revokeAdminAction(formData: FormData) {
  await requireAdmin();
  const sfuId = String(formData.get("sfuId") ?? "").trim().toLowerCase();
  if (!sfuId) return { ok: false as const, error: "SFU ID is required" };

  if (getBootstrapAdminIds().includes(sfuId)) {
    return { ok: false as const, error: `${sfuId} is a bootstrap admin (set in ADMIN_SFU_IDS) and cannot be revoked here. Remove them from ADMIN_SFU_IDS instead.` };
  }

  const user = await findUserBySfuId(sfuId);
  if (!user || user.role !== "GLOBAL_ADMIN") {
    return { ok: false as const, error: `${sfuId} is not currently an admin.` };
  }
  await setUserRole(user.id, "USER");
  revalidatePath("/admin");
  return { ok: true as const };
}
