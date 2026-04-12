"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClassAction } from "@/app/actions/class";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function CreateClassForm() {
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
        const r = await createClassAction(fd);
        setPending(false);
        if (!r.ok) {
          setErr(r.error);
          return;
        }
        router.push(`/classes/${r.classId}`);
        router.refresh();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required placeholder="CMPT 372 — Spring 2025" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Textarea id="description" name="description" rows={3} placeholder="Brief description of the class…" />
      </div>
      {err && (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={pending} size="lg">
        {pending ? "Creating…" : "Create class"}
      </Button>
    </form>
  );
}
