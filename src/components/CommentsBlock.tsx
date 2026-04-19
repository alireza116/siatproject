"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

type VoteState = { upvotes: number; downvotes: number; userVote: -1 | 0 | 1 };
type RatingState = { average: number; count: number; userRating: number | null };

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
  className?: string;
};

function initVoteStates(comments: CommentRow[]): Map<string, VoteState> {
  return new Map(
    comments.map((c) => [c.id, { upvotes: c.upvotes, downvotes: c.downvotes, userVote: c.userVote }])
  );
}

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
  className,
}: Props) {
  const router = useRouter();

  // ── Vote state (optimistic) ──────────────────────────────────────────────
  const [voteStates, setVoteStates] = useState<Map<string, VoteState>>(() =>
    initVoteStates(comments)
  );
  // Sync when server sends fresh comment data (after router.refresh() from comment CRUD)
  useEffect(() => {
    setVoteStates(initVoteStates(comments));
  }, [comments]);

  async function handleVote(commentId: string, newVote: -1 | 0 | 1) {
    const prev = voteStates.get(commentId);
    if (!prev) return;

    // Apply optimistic update immediately
    const next: VoteState = { ...prev };
    if (prev.userVote === 1) next.upvotes--;
    if (prev.userVote === -1) next.downvotes--;
    if (newVote === 1) next.upvotes++;
    if (newVote === -1) next.downvotes++;
    next.userVote = newVote;
    setVoteStates((m) => new Map(m).set(commentId, next));

    const r = await setCommentVoteAction(commentId, newVote);
    if (!r.ok) {
      setVoteStates((m) => new Map(m).set(commentId, prev)); // revert
      alert(r.error);
    }
    // No router.refresh() — optimistic state is already correct.
    // revalidatePath in the action keeps other pages up to date.
  }

  // ── Rating state (optimistic) ────────────────────────────────────────────
  const [rating, setRating] = useState<RatingState>({
    average: ratingAverage,
    count: ratingCount,
    userRating,
  });
  const [ratingPending, setRatingPending] = useState(false);
  useEffect(() => {
    setRating({ average: ratingAverage, count: ratingCount, userRating });
  }, [ratingAverage, ratingCount, userRating]);

  async function handleRating(stars: 0 | 1 | 2 | 3 | 4 | 5) {
    const prev = rating;
    const { average: avg, count, userRating: prevRating } = prev;

    // Compute optimistic new average
    let newAvg = avg;
    let newCount = count;
    const sum = avg * count;
    if (stars === 0 && prevRating !== null) {
      // Removing an existing rating
      newCount = count - 1;
      newAvg = newCount > 0 ? (sum - prevRating) / newCount : 0;
    } else if (stars > 0 && prevRating !== null) {
      // Replacing an existing rating
      newAvg = (sum - prevRating + stars) / count;
    } else if (stars > 0 && prevRating === null) {
      // Adding a new rating
      newCount = count + 1;
      newAvg = (sum + stars) / newCount;
    }

    setRating({ average: newAvg, count: newCount, userRating: stars === 0 ? null : stars });
    setRatingPending(true);
    const r = await setSubmissionRatingAction(submissionId, stars);
    setRatingPending(false);
    if (!r.ok) {
      setRating(prev); // revert
      alert(r.error);
    }
    // No router.refresh() — rating on list pages updates on next navigation
    // (revalidatePath in the action handles cache invalidation).
  }

  // ── Comment CRUD state ───────────────────────────────────────────────────
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editPending, setEditPending] = useState(false);

  return (
    <section className={className}>
      <h2 className="text-base font-semibold">Feedback</h2>
      <div className="mt-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="font-medium text-foreground">
            Average rating:{" "}
            <span className="font-mono">
              {rating.count > 0 ? rating.average.toFixed(1) : "No ratings"}
            </span>
            {rating.count > 0 && (
              <span className="text-muted-foreground"> ({rating.count})</span>
            )}
          </span>
          {canRate && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Your rating
              <select
                value={rating.userRating ?? 0}
                disabled={ratingPending}
                onChange={(e) => handleRating(Number(e.target.value) as 0 | 1 | 2 | 3 | 4 | 5)}
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
          <Textarea name="body" required rows={3} placeholder="Leave constructive feedback…" />
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
            {comments.map((c) => {
              const vs = voteStates.get(c.id) ?? { upvotes: c.upvotes, downvotes: c.downvotes, userVote: c.userVote };
              return (
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
                            if (!r.ok) { alert(r.error); return; }
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
                          onClick={() => { setEditingId(null); setEditBody(""); }}
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
                        className={`rounded border px-2 py-0.5 transition-colors ${
                          vs.userVote === 1
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        onClick={() => handleVote(c.id, vs.userVote === 1 ? 0 : 1)}
                      >
                        ▲ {vs.upvotes}
                      </button>
                      <button
                        type="button"
                        className={`rounded border px-2 py-0.5 transition-colors ${
                          vs.userVote === -1
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        onClick={() => handleVote(c.id, vs.userVote === -1 ? 0 : -1)}
                      >
                        ▼ {vs.downvotes}
                      </button>
                    </div>
                  )}

                  <div className="mt-1.5 flex items-center gap-3">
                    {c.userId === signedInUserId && (
                      <button
                        type="button"
                        className="text-xs text-foreground hover:underline"
                        onClick={() => { setEditingId(c.id); setEditBody(c.body); }}
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
                          if (!r.ok) { alert(r.error); return; }
                          router.refresh();
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {comments.length === 0 && canComment && (
        <p className="mt-4 text-sm text-muted-foreground">No comments yet. Be the first!</p>
      )}
    </section>
  );
}
