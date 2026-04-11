"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateSfuIdAction } from "@/app/actions/sfu";

export function SfuIdForm() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-8 space-y-4"
      action={async (fd) => {
        setPending(true);
        setErr(null);
        const r = await updateSfuIdAction(fd);
        setPending(false);
        if (!r.ok) {
          setErr(r.error);
          return;
        }
        router.push("/dashboard");
        router.refresh();
      }}
    >
      <div>
        <label htmlFor="sfuId" className="block text-sm font-medium text-zinc-700">
          SFU ID
        </label>
        <input
          id="sfuId"
          name="sfuId"
          required
          autoComplete="username"
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          placeholder="e.g. jsmith or 123456789"
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
        className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
