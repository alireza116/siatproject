"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { leaveClassAction } from "@/app/actions/class";
import { Button } from "@/components/ui/button";

export function LeaveClassButton({ classId }: { classId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Button
      variant="ghost"
      size="sm"
      className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
      disabled={pending}
      onClick={async () => {
        if (!confirm("Leave this class? You can rejoin with a join code.")) return;
        setPending(true);
        const r = await leaveClassAction(classId);
        setPending(false);
        if (!r.ok) {
          alert(r.error);
          return;
        }
        router.refresh();
      }}
    >
      {pending ? "Leaving…" : "Leave"}
    </Button>
  );
}
