"use client";

import { signIn } from "next-auth/react";

type Props = {
  /** Where to send the user after Google OAuth (e.g. `/dashboard?persona=student`). */
  callbackUrl?: string;
};

export function SignInGoogle({ callbackUrl = "/dashboard" }: Props) {
  return (
    <button
      type="button"
      onClick={() => signIn("google", { callbackUrl })}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50"
    >
      Continue with Google
    </button>
  );
}
