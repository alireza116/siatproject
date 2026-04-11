"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  submissionId: string;
  classId: string;
  action: (id: string) => Promise<{ ok: boolean; error?: string }>;
};

export function DeleteSubmissionButton({ submissionId, classId, action }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-60"
      onClick={async () => {
        if (!confirm("Permanently delete this submission and its comments?")) return;
        setPending(true);
        const r = await action(submissionId);
        setPending(false);
        if (!r.ok) {
          alert(r.error ?? "Failed");
          return;
        }
        router.push(`/classes/${classId}`);
        router.refresh();
      }}
    >
      {pending ? "…" : "Delete submission"}
    </button>
  );
}
