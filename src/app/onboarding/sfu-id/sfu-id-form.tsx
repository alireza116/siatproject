"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateSfuIdAction } from "@/app/actions/sfu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function SfuIdForm() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-4"
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
      <div className="space-y-2">
        <Label htmlFor="sfuId">SFU ID</Label>
        <Input
          id="sfuId"
          name="sfuId"
          required
          autoComplete="username"
          placeholder="e.g. jsmith or 123456789"
        />
      </div>
      {err && (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
