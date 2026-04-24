"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateDisplayNameAction } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Props = {
  initialDisplayName: string;
  sfuId?: string | null;
};

export function DisplayNameForm({ initialDisplayName, sfuId }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(initialDisplayName);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        setPending(true);
        const fd = new FormData();
        fd.set("displayName", value);
        const r = await updateDisplayNameAction(fd);
        setPending(false);
        if (!r.ok) {
          setErr(r.error);
          return;
        }
        router.refresh();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          name="displayName"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={sfuId ? `Shown instead of ${sfuId} across the app` : "How you want to appear in the app"}
          maxLength={80}
          autoComplete="nickname"
        />
        <p className="text-xs text-muted-foreground">
          Optional. If you leave this empty, your SFU computing ID is shown where a name is needed.
        </p>
      </div>
      {err && (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
