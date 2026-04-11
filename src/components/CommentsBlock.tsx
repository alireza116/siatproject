"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addCommentAction, deleteCommentAction } from "@/app/actions/comment";

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
    <section className="mt-10 rounded-lg border border-zinc-200 bg-white p-6">
      <h2 className="text-lg font-medium">Feedback</h2>
      {!canComment && (
        <p className="mt-2 text-sm text-zinc-500">Comments are disabled for this public project.</p>
      )}
      {canComment && (
        <form
          className="mt-4 space-y-2"
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
          <label className="block text-sm font-medium">Add comment</label>
          <textarea
            name="body"
            required
            rows={3}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Constructive feedback…"
          />
          {err && (
            <p className="text-sm text-red-600" role="alert">
              {err}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending ? "Posting…" : "Post"}
          </button>
        </form>
      )}
      <ul className="mt-6 space-y-4">
        {comments.map((c) => (
          <li key={c.id} className="border-t border-zinc-100 pt-4 text-sm first:border-0 first:pt-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium text-zinc-800">{c.userLabel}</span>
              <span className="text-xs text-zinc-400">{new Date(c.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-zinc-700">{c.body}</p>
            {(c.userId === signedInUserId || isInstructor) && (
              <button
                type="button"
                className="mt-2 text-xs text-red-700 hover:underline"
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
    </section>
  );
}
