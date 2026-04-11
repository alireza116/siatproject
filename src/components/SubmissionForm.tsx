"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createSubmissionAction,
  updateSubmissionAction,
} from "@/app/actions/submission";

type Mode = "create" | "edit";

type Props = {
  mode: Mode;
  classId: string;
  submissionId?: string;
  initial?: {
    title: string;
    groupName: string;
    projectUrls: string;
    youtubeUrls: string;
    visibility?: string;
    commentsEnabled?: boolean;
  };
  showVisibility?: boolean;
};

export function SubmissionForm({
  mode,
  classId,
  submissionId,
  initial,
  showVisibility,
}: Props) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setErr(null);
        const fd = new FormData(e.currentTarget);
        const r =
          mode === "create"
            ? await createSubmissionAction(fd)
            : await updateSubmissionAction(fd);
        setPending(false);
        if (!r.ok) {
          setErr(r.error);
          return;
        }
        if (mode === "create" && "id" in r) {
          router.push(`/classes/${classId}/submissions/${r.id}`);
        } else {
          router.refresh();
        }
      }}
    >
      <input type="hidden" name="classId" value={classId} />
      {mode === "edit" && submissionId && (
        <input type="hidden" name="submissionId" value={submissionId} />
      )}
      <div>
        <label className="block text-sm font-medium">Title</label>
        <input
          name="title"
          required
          defaultValue={initial?.title}
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Group name</label>
        <input
          name="groupName"
          required
          defaultValue={initial?.groupName}
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Project URLs (one per line)</label>
        <textarea
          name="projectUrls"
          rows={4}
          defaultValue={initial?.projectUrls}
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm"
          placeholder="https://github.com/..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium">YouTube URLs or video IDs (one per line)</label>
        <textarea
          name="youtubeUrls"
          rows={3}
          required
          defaultValue={initial?.youtubeUrls}
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm"
          placeholder="https://www.youtube.com/watch?v=..."
        />
      </div>
      {showVisibility && (
        <>
          <div>
            <label className="block text-sm font-medium">Visibility</label>
            <select
              name="visibility"
              defaultValue={initial?.visibility ?? "PRIVATE"}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="PRIVATE">Private (class only)</option>
              <option value="PUBLIC">Public (gallery)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Comments when public</label>
            <select
              name="commentsEnabled"
              defaultValue={initial?.commentsEnabled === false ? "false" : "true"}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>
        </>
      )}
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
        {pending ? "Saving…" : mode === "create" ? "Create submission" : "Save changes"}
      </button>
    </form>
  );
}
