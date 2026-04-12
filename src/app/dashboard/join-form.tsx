"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { joinClassAction } from "@/app/actions/class";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function JoinForm() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-5">
      <p className="text-sm font-semibold text-foreground">Join a class</p>
      <p className="mt-0.5 text-sm text-muted-foreground">Enter the join code from your instructor.</p>
      <form
        className="mt-4 space-y-3"
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
        {err && (
          <Alert variant="destructive">
            <AlertDescription>{err}</AlertDescription>
          </Alert>
        )}
        <div className="flex flex-wrap gap-2">
          <Input
            name="joinCode"
            placeholder="Join code"
            className="min-w-[180px] flex-1 font-mono uppercase"
          />
          <Button type="submit" disabled={pending} variant="secondary">
            {pending ? "Joining…" : "Join"}
          </Button>
        </div>
      </form>
    </div>
  );
}
