"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { grantAdminAction, revokeAdminAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function RevokeAdminButton({ sfuId }: { sfuId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div>
      <Button
        type="button"
        variant="destructive"
        size="xs"
        disabled={pending}
        onClick={async () => {
          if (!confirm(`Revoke admin access for ${sfuId}?`)) return;
          setPending(true);
          setErr(null);
          const fd = new FormData();
          fd.append("sfuId", sfuId);
          const r = await revokeAdminAction(fd);
          setPending(false);
          if (!r.ok) {
            setErr(r.error);
            return;
          }
          router.refresh();
        }}
      >
        {pending ? "…" : "Revoke"}
      </Button>
      {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
    </div>
  );
}

export function GrantAdminForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  return (
    <div className="space-y-3">
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          setErr(null);
          setSuccess(false);
          const fd = new FormData(e.currentTarget);
          const r = await grantAdminAction(fd);
          setPending(false);
          if (!r.ok) {
            setErr(r.error);
            return;
          }
          setSuccess(true);
          (e.target as HTMLFormElement).reset();
          router.refresh();
        }}
      >
        <Input
          type="text"
          name="sfuId"
          placeholder="SFU ID (e.g. jsmith)"
          className="flex-1"
          required
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Granting…" : "Grant"}
        </Button>
      </form>
      {err && (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <AlertDescription>Admin access granted.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
