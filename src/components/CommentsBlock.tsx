"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addCommentAction, deleteCommentAction } from "@/app/actions/comment";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

export type CommentRow = {
  id: string;
  body: string;
  createdAt: string;
  userLabel: string;
  userId: string;
};

type Props = {
  submissionId: string;
  comments: CommentRow[];
  canComment: boolean;
  signedInUserId: string;
  isInstructor: boolean;
};

export function CommentsBlock({
  submissionId,
  comments,
  canComment,
  signedInUserId,
  isInstructor,
}: Props) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <section className="mt-10">
      <h2 className="text-base font-semibold">Feedback</h2>

      {!canComment && (
        <p className="mt-2 text-sm text-muted-foreground">
          Comments are disabled for this public project.
        </p>
      )}

      {canComment && (
        <form
          className="mt-4 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            setErr(null);
            const fd = new FormData(e.currentTarget);
            const r = await addCommentAction(fd);
            setPending(false);
            if (!r.ok) {
              setErr(r.error);
              return;
            }
            (e.target as HTMLFormElement).reset();
            router.refresh();
          }}
        >
          <input type="hidden" name="submissionId" value={submissionId} />
          <Textarea
            name="body"
            required
            rows={3}
            placeholder="Leave constructive feedback…"
          />
          {err && (
            <Alert variant="destructive">
              <AlertDescription>{err}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={pending} size="sm">
            {pending ? "Posting…" : "Post comment"}
          </Button>
        </form>
      )}

      {comments.length > 0 && (
        <>
          <Separator className="mt-6" />
          <ul className="mt-4 space-y-5">
            {comments.map((c) => (
              <li key={c.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{c.userLabel}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/80">{c.body}</p>
                {(c.userId === signedInUserId || isInstructor) && (
                  <button
                    type="button"
                    className="mt-1.5 text-xs text-destructive hover:underline"
                    onClick={async () => {
                      if (!confirm("Delete this comment?")) return;
                      const r = await deleteCommentAction(c.id);
                      if (!r.ok) {
                        alert(r.error);
                        return;
                      }
                      router.refresh();
                    }}
                  >
                    Delete
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {comments.length === 0 && canComment && (
        <p className="mt-4 text-sm text-muted-foreground">No comments yet. Be the first!</p>
      )}
    </section>
  );
}
