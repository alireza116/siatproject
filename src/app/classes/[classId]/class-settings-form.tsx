"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateClassSettingsAction } from "@/app/actions/class-settings";

type Props = {
  classId: string;
  defaultVisibility: string;
  commentsOnPublic: boolean;
  allowGroupSubmissions: boolean;
};

export function ClassSettingsForm(p: Props) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-8 rounded-lg border border-zinc-200 bg-white p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setErr(null);
        const fd = new FormData(e.currentTarget);
        const r = await updateClassSettingsAction(fd);
        setPending(false);
        if (!r.ok) {
          setErr(r.error);
          return;
        }
        router.refresh();
      }}
    >
      <input type="hidden" name="classId" value={p.classId} />
      <h2 className="text-sm font-semibold">Class settings (instructor)</h2>
      {err && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {err}
        </p>
      )}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-zinc-700">Default visibility for new submissions</span>
          <select
            name="defaultVisibility"
            defaultValue={p.defaultVisibility}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="PRIVATE">Private (class only)</option>
            <option value="PUBLIC">Public (gallery)</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="commentsOnPublic"
            value="true"
            defaultChecked={p.commentsOnPublic}
            className="rounded border-zinc-300"
          />
          Allow comments on public submissions
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="allowGroupSubmissions"
            value="true"
            defaultChecked={p.allowGroupSubmissions}
            className="rounded border-zinc-300"
          />
          Allow group submissions
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-lg border border-zinc-300 bg-zinc-100 px-4 py-2 text-sm font-medium hover:bg-zinc-200 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
