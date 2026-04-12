"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  submissionId: string;
  classId: string;
  action: (id: string) => Promise<{ ok: boolean; error?: string }>;
};

export function DeleteSubmissionButton({ submissionId, classId, action }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      disabled={pending}
      onClick={async () => {
        if (!confirm("Permanently delete this submission and all its comments?")) return;
        setPending(true);
        const r = await action(submissionId);
        setPending(false);
        if (!r.ok) {
          alert(r.error ?? "Failed to delete");
          return;
        }
        router.push(`/classes/${classId}`);
        router.refresh();
      }}
    >
      {pending ? "Deleting…" : "Delete submission"}
    </Button>
  );
}
