"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="text-zinc-600 hover:text-zinc-900"
    >
      Sign out
    </button>
  );
}
