"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  addCommentAction,
  deleteCommentAction,
  setCommentVoteAction,
  setSubmissionRatingAction,
  updateCommentAction,
} from "@/app/actions/comment";
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
  upvotes: number;
  downvotes: number;
  userVote: -1 | 0 | 1;
};

type Props = {
  submissionId: string;
  comments: CommentRow[];
  canComment: boolean;
  canRate: boolean;
  hasOwnComment: boolean;
  signedInUserId: string;
  isInstructor: boolean;
  ratingAverage: number;
  ratingCount: number;
  userRating: number | null;
};

export function CommentsBlock({
  submissionId,
  comments,
  canComment,
  canRate,
  hasOwnComment,
  signedInUserId,
  isInstructor,
  ratingAverage,
  ratingCount,
  userRating,
}: Props) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [ratingPending, setRatingPending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editPending, setEditPending] = useState(false);

  return (
    <section className="mt-10">
      <h2 className="text-base font-semibold">Feedback</h2>
      <div className="mt-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="font-medium text-foreground">
            Average rating:{" "}
            <span className="font-mono">
              {ratingCount > 0 ? ratingAverage.toFixed(1) : "No ratings"}
            </span>
            {ratingCount > 0 && (
              <span className="text-muted-foreground"> ({ratingCount})</span>
            )}
          </span>
          {canRate && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Your rating
              <select
                value={userRating ?? 0}
                disabled={ratingPending}
                onChange={async (e) => {
                  setRatingPending(true);
                  const r = await setSubmissionRatingAction(
                    submissionId,
                    Number(e.target.value) as 0 | 1 | 2 | 3 | 4 | 5
                  );
                  setRatingPending(false);
                  if (!r.ok) {
                    alert(r.error);
                    return;
                  }
                  router.refresh();
                }}
                className="h-7 rounded border border-input bg-transparent px-2 text-xs"
              >
                <option value={0}>Clear</option>
                <option value={1}>1 ★</option>
                <option value={2}>2 ★★</option>
                <option value={3}>3 ★★★</option>
                <option value={4}>4 ★★★★</option>
                <option value={5}>5 ★★★★★</option>
              </select>
            </label>
          )}
        </div>
      </div>

      {!canComment && (
        <p className="mt-2 text-sm text-muted-foreground">
          Comments are disabled for this public project.
        </p>
      )}

      {canComment && !hasOwnComment && (
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

      {canComment && hasOwnComment && (
        <p className="mt-3 text-sm text-muted-foreground">
          You already posted your one allowed comment for this submission.
        </p>
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
                {editingId === c.id ? (
                  <div className="mt-2 space-y-2">
                    <Textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={3}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={editPending}
                        onClick={async () => {
                          setEditPending(true);
                          const r = await updateCommentAction(c.id, editBody);
                          setEditPending(false);
                          if (!r.ok) {
                            alert(r.error);
                            return;
                          }
                          setEditingId(null);
                          setEditBody("");
                          router.refresh();
                        }}
                      >
                        {editPending ? "Saving…" : "Save"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(null);
                          setEditBody("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/80">{c.body}</p>
                )}
                {signedInUserId && c.userId !== signedInUserId && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      className={`rounded border px-2 py-0.5 ${
                        c.userVote === 1 ? "bg-muted text-foreground" : "text-muted-foreground"
                      }`}
                      onClick={async () => {
                        const r = await setCommentVoteAction(c.id, c.userVote === 1 ? 0 : 1);
                        if (!r.ok) {
                          alert(r.error);
                          return;
                        }
                        router.refresh();
                      }}
                    >
                      ▲ {c.upvotes}
                    </button>
                    <button
                      type="button"
                      className={`rounded border px-2 py-0.5 ${
                        c.userVote === -1 ? "bg-muted text-foreground" : "text-muted-foreground"
                      }`}
                      onClick={async () => {
                        const r = await setCommentVoteAction(c.id, c.userVote === -1 ? 0 : -1);
                        if (!r.ok) {
                          alert(r.error);
                          return;
                        }
                        router.refresh();
                      }}
                    >
                      ▼ {c.downvotes}
                    </button>
                  </div>
                )}
                <div className="mt-1.5 flex items-center gap-3">
                  {c.userId === signedInUserId && (
                    <button
                      type="button"
                      className="text-xs text-foreground hover:underline"
                      onClick={() => {
                        setEditingId(c.id);
                        setEditBody(c.body);
                      }}
                    >
                      Edit
                    </button>
                  )}
                  {(c.userId === signedInUserId || isInstructor) && (
                    <button
                      type="button"
                      className="text-xs text-destructive hover:underline"
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
                </div>
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
