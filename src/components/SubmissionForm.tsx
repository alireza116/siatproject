"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createSubmissionAction,
  updateSubmissionAction,
} from "@/app/actions/submission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Mode = "create" | "edit";

type Props = {
  mode: Mode;
  classId: string;
  submissionId?: string;
  initial?: {
    title: string;
    groupName: string;
    description?: string;
    projectUrls: string;
    youtubeUrls: string;
    visibility?: string;
    commentsEnabled?: boolean;
  };
  showVisibility?: boolean;
};

export function SubmissionForm({
  mode,
  classId,
  submissionId,
  initial,
  showVisibility,
}: Props) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-6 space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setErr(null);
        const fd = new FormData(e.currentTarget);
        const r =
          mode === "create"
            ? await createSubmissionAction(fd)
            : await updateSubmissionAction(fd);
        setPending(false);
        if (!r.ok) {
          setErr(r.error);
          return;
        }
        if (mode === "create" && "id" in r) {
          router.push(`/classes/${classId}/submissions/${r.id}`);
        } else {
          router.refresh();
        }
      }}
    >
      <input type="hidden" name="classId" value={classId} />
      {mode === "edit" && submissionId && (
        <input type="hidden" name="submissionId" value={submissionId} />
      )}

      <div className="space-y-2">
        <Label>Title</Label>
        <Input name="title" required defaultValue={initial?.title} placeholder="My Project" />
      </div>

      <div className="space-y-2">
        <Label>Group name</Label>
        <Input name="groupName" required defaultValue={initial?.groupName} placeholder="Team Alpha" />
      </div>

      <div className="space-y-2">
        <Label>Abstract <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Textarea
          name="description"
          rows={4}
          defaultValue={initial?.description}
          placeholder="Briefly describe your project — what it does, the problem it solves, and your key technical decisions…"
        />
      </div>

      <div className="space-y-2">
        <Label>YouTube URLs or video IDs <span className="text-destructive">*</span></Label>
        <Textarea
          name="youtubeUrls"
          rows={3}
          required
          defaultValue={initial?.youtubeUrls}
          className="font-mono text-xs"
          placeholder={"https://www.youtube.com/watch?v=...\nhttps://youtu.be/..."}
        />
        <p className="text-xs text-muted-foreground">One per line.</p>
      </div>

      <div className="space-y-2">
        <Label>Project URLs <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Textarea
          name="projectUrls"
          rows={3}
          defaultValue={initial?.projectUrls}
          className="font-mono text-xs"
          placeholder={"https://github.com/...\nhttps://..."}
        />
        <p className="text-xs text-muted-foreground">One per line.</p>
      </div>

      {showVisibility && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="visibility">Visibility</Label>
            <select
              id="visibility"
              name="visibility"
              defaultValue={initial?.visibility ?? "PRIVATE"}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="PRIVATE">Private (class only)</option>
              <option value="PUBLIC">Public (gallery)</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="commentsEnabled">Comments when public</Label>
            <select
              id="commentsEnabled"
              name="commentsEnabled"
              defaultValue={initial?.commentsEnabled === false ? "false" : "true"}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>
        </div>
      )}

      {err && (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={pending} size="lg">
        {pending ? "Saving…" : mode === "create" ? "Create submission" : "Save changes"}
      </Button>
    </form>
  );
}
