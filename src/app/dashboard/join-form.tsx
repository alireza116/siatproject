"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { joinClassAction } from "@/app/actions/class";

export function JoinForm() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-10 rounded-lg border border-zinc-200 bg-white p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setErr(null);
        const fd = new FormData(e.currentTarget);
        const r = await joinClassAction(fd);
        setPending(false);
        if (!r.ok) {
          setErr(r.error);
          return;
        }
        router.push(`/classes/${r.classId}`);
        router.refresh();
      }}
    >
      <h2 className="text-sm font-semibold text-zinc-900">Join a class</h2>
      <p className="mt-1 text-sm text-zinc-600">Enter the join code from your instructor.</p>
      {err && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {err}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          name="joinCode"
          placeholder="Join code"
          className="min-w-[200px] flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-zinc-300 bg-zinc-100 px-4 py-2 text-sm font-medium hover:bg-zinc-200 disabled:opacity-60"
        >
          {pending ? "…" : "Join"}
        </button>
      </div>
    </form>
  );
}
