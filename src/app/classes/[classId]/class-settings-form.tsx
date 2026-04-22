"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateClassSettingsAction } from "@/app/actions/class-settings";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Props = {
  classId: string;
  defaultVisibility: string;
  commentsOnPublic: boolean;
  publicShowGroupName: boolean;
  publicShowAuthorNames: boolean;
  publicShowAuthorSfuIds: boolean;
};

export function ClassSettingsForm({
  classId,
  defaultVisibility,
  commentsOnPublic,
  publicShowGroupName,
  publicShowAuthorNames,
  publicShowAuthorSfuIds,
}: Props) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div>
      <h2 className="text-base font-semibold">Class settings</h2>
      <form
        className="mt-4 space-y-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          setErr(null);
          const fd = new FormData(e.currentTarget);
          const r = await updateClassSettingsAction(fd);
          setPending(false);
          if (!r.ok) {
            setErr(r.error);
            return;
          }
          router.refresh();
        }}
      >
        <input type="hidden" name="classId" value={classId} />

        <div className="space-y-2">
          <Label htmlFor="defaultVisibility">Default visibility for new submissions</Label>
          <select
            id="defaultVisibility"
            name="defaultVisibility"
            defaultValue={defaultVisibility}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="PRIVATE">Private (class only)</option>
            <option value="PUBLIC">Public (gallery)</option>
          </select>
        </div>

        <div className="space-y-3">
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="commentsOnPublic"
              value="true"
              defaultChecked={commentsOnPublic}
              className="h-4 w-4 rounded border-input accent-foreground"
            />
            <span>Allow comments on public submissions</span>
          </label>
        </div>

        <fieldset className="space-y-3 rounded-xl border border-border bg-card/50 px-4 py-3">
          <legend className="px-1 text-sm font-medium text-foreground">
            Public gallery display
          </legend>
          <p className="text-xs text-muted-foreground">
            Controls what outside visitors see on public gallery pages. These settings do not
            affect the in-class project view.
          </p>
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="publicShowGroupName"
              value="true"
              defaultChecked={publicShowGroupName}
              className="h-4 w-4 rounded border-input accent-foreground"
            />
            <span>Show group name</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="publicShowAuthorNames"
              value="true"
              defaultChecked={publicShowAuthorNames}
              className="h-4 w-4 rounded border-input accent-foreground"
            />
            <span>Show author names</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="publicShowAuthorSfuIds"
              value="true"
              defaultChecked={publicShowAuthorSfuIds}
              className="h-4 w-4 rounded border-input accent-foreground"
            />
            <span>Show author SFU IDs</span>
          </label>
        </fieldset>

        {err && (
          <Alert variant="destructive">
            <AlertDescription>{err}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={pending} variant="secondary" size="sm">
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </form>
    </div>
  );
}
