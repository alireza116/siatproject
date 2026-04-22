"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setAllSubmissionsVisibilityInClassAction } from "@/app/actions/submission-visibility-bulk";
import { Button } from "@/components/ui/button";

type Props = {
  classId: string;
  /** Narrow horizontal layout for list rows (e.g. global admin page). */
  compact?: boolean;
};

export function BulkSubmissionsVisibilityControls({ classId, compact }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<null | "PUBLIC" | "PRIVATE">(null);

  async function run(visibility: "PUBLIC" | "PRIVATE") {
    const label =
      visibility === "PUBLIC"
        ? "public (visible in the outside gallery)"
        : "private (class only, not in the public gallery)";
    if (
      !confirm(
        `Set every submission in this class to ${label}? Individual submissions will keep this setting until changed again.`,
      )
    ) {
      return;
    }
    setPending(visibility);
    const r = await setAllSubmissionsVisibilityInClassAction(classId, visibility);
    setPending(null);
    if (!r.ok) {
      alert(r.error);
      return;
    }
    router.refresh();
    if (r.updated === 0) {
      alert("No submissions to update.");
    } else {
      alert(`Updated ${r.updated} submission${r.updated === 1 ? "" : "s"}.`);
    }
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled={pending !== null}
          onClick={() => run("PUBLIC")}
        >
          {pending === "PUBLIC" ? "…" : "All public"}
        </Button>
        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled={pending !== null}
          onClick={() => run("PRIVATE")}
        >
          {pending === "PRIVATE" ? "…" : "All private"}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-base font-semibold">All submissions visibility</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Override visibility for every project in this class at once. This sets each
        submission&apos;s public / class-only flag explicitly (it does not rely on the class
        default for new submissions).
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending !== null}
          onClick={() => run("PUBLIC")}
        >
          {pending === "PUBLIC" ? "Updating…" : "Make all public"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending !== null}
          onClick={() => run("PRIVATE")}
        >
          {pending === "PRIVATE" ? "Updating…" : "Make all private"}
        </Button>
      </div>
    </div>
  );
}
