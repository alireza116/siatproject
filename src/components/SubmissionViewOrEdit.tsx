"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SubmissionForm } from "@/components/SubmissionForm";

type ReadOnlyData = {
  description?: string;
  youtubeVideoIds: string[];
  projectUrls: string[];
};

type EditData = {
  title: string;
  groupName: string;
  description?: string;
  projectUrls: string;
  youtubeUrls: string;
  coauthorSfuIds?: string;
  visibility?: string;
  commentsEnabled?: boolean;
};

type Props = {
  classId: string;
  submissionId: string;
  view: ReadOnlyData;
  edit: EditData;
  canEdit: boolean;
  canChangeVisibility: boolean;
  /** Shown above the form when the author is allowed to edit content but not change visibility. */
  showVisibilityLockedNote?: boolean;
  /** Shown (in read view) when the viewer is the author but editing is disabled for their account. */
  showEditingDisabledNote?: boolean;
};

export function SubmissionViewOrEdit({
  classId,
  submissionId,
  view,
  edit,
  canEdit,
  canChangeVisibility,
  showVisibilityLockedNote,
  showEditingDisabledNote,
}: Props) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Edit submission</h2>
        </div>
        {showVisibilityLockedNote && !canChangeVisibility && (
          <p className="mt-2 text-sm text-muted-foreground">
            Public/private and comment settings are locked for your account; other fields can be
            updated below.
          </p>
        )}
        <SubmissionForm
          mode="edit"
          classId={classId}
          submissionId={submissionId}
          showVisibility={canChangeVisibility}
          initial={edit}
          onSaved={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </section>
    );
  }

  return (
    <>
      {view.description && (
        <section>
          <h2 className="text-sm font-semibold text-foreground">Abstract</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {view.description}
          </p>
        </section>
      )}

      {view.youtubeVideoIds.length > 0 && (
        <section className={view.description ? "mt-8" : ""}>
          <h2 className="text-sm font-semibold text-foreground">Videos</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {view.youtubeVideoIds.map((id) => (
              <div key={id} className="aspect-video overflow-hidden rounded-xl bg-muted">
                <iframe
                  title={`YouTube ${id}`}
                  className="h-full w-full"
                  src={`https://www.youtube.com/embed/${id}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {view.projectUrls.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-foreground">Project links</h2>
          <ul className="mt-2 space-y-1">
            {view.projectUrls.map((u) => (
              <li key={u}>
                <a
                  href={u}
                  className="text-sm text-foreground underline underline-offset-4 hover:text-muted-foreground"
                  target="_blank"
                  rel="noreferrer"
                >
                  {u}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showEditingDisabledNote && (
        <p className="mt-10 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Editing is turned off for your account in this class. Contact your instructor if you
          need changes.
        </p>
      )}

      {canEdit && (
        <>
          <Separator className="mt-10" />
          <div className="mt-6 flex items-center gap-3">
            <Button type="button" onClick={() => setEditing(true)}>
              Edit submission
            </Button>
            <span className="text-xs text-muted-foreground">
              Opens the form to update content. Changes save when you click Save.
            </span>
          </div>
        </>
      )}
    </>
  );
}
