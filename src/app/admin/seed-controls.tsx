"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { seedDemoDataAction, clearDemoDataAction } from "@/app/actions/seed";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Props = {
  demoExists: boolean;
};

export function SeedControls({ demoExists }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function run(action: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    setPending(true);
    setMsg(null);
    const r = await action();
    setPending(false);
    if (!r.ok) {
      setIsError(true);
      setMsg(r.error ?? "Something went wrong.");
    } else {
      setIsError(false);
      setMsg(r.message ?? "Done.");
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {!demoExists && (
          <Button
            size="sm"
            disabled={pending}
            onClick={() => run(seedDemoDataAction)}
          >
            {pending ? "Creating…" : "Create demo data"}
          </Button>
        )}
        {demoExists && (
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              if (!confirm("Delete the demo class and all its data?")) return;
              run(clearDemoDataAction);
            }}
          >
            {pending ? "Clearing…" : "Clear demo data"}
          </Button>
        )}
      </div>
      {msg && (
        <Alert variant={isError ? "destructive" : "default"}>
          <AlertDescription>{msg}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
