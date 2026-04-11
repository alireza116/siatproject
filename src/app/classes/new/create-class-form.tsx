"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClassAction } from "@/app/actions/class";

export function CreateClassForm() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-8 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setErr(null);
        const fd = new FormData(e.currentTarget);
        const r = await createClassAction(fd);
        setPending(false);
        if (!r.ok) {
          setErr(r.error);
          return;
        }
        router.push(`/classes/${r.classId}`);
        router.refresh();
      }}
    >
      <div>
        <label htmlFor="title" className="block text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          placeholder="CMPT 372 — Spring"
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium">
          Description (optional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>
      {err && (
        <p className="text-sm text-red-600" role="alert">
          {err}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create class"}
      </button>
    </form>
  );
}
