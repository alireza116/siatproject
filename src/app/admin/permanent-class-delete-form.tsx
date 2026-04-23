"use client";

import { permanentlyDeleteClassAction } from "@/app/actions/admin-class-delete";
import { PERMANENT_CLASS_DELETE_PHRASE } from "@/lib/constants/class-deletion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

export type ClassForPermanentDelete = {
  id: string;
  title: string;
  joinCode: string;
  submissionCount: number;
};

type Props = {
  classes: ClassForPermanentDelete[];
};

export function PermanentClassDeleteForm({ classes }: Props) {
  const router = useRouter();
  const [classId, setClassId] = useState("");
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [phraseInput, setPhraseInput] = useState("");
  const [ack, setAck] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const selected = useMemo(
    () => classes.find((c) => c.id === classId) ?? null,
    [classes, classId],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!selected) {
      setErr("Choose a class.");
      return;
    }
    if (!ack) {
      setErr("Confirm that you understand this action is irreversible.");
      return;
    }

    const summary = `Permanently delete "${selected.title}"?\n\nThis will remove the class, all ${selected.submissionCount} submission(s), every enrollment, comment, vote, and star rating. There is no undo.`;
    if (!confirm(summary)) return;

    setPending(true);
    const r = await permanentlyDeleteClassAction({
      classId: selected.id,
      confirmationJoinCode: joinCodeInput,
      confirmationPhrase: phraseInput,
    });
    setPending(false);

    if (!r.ok) {
      setErr(r.error);
      return;
    }

    setClassId("");
    setJoinCodeInput("");
    setPhraseInput("");
    setAck(false);
    router.refresh();
    alert(
      `Deleted. Removed ${r.submissionCount} submission(s) and ${r.commentCount} comment document(s) (votes and ratings were cleared as well).`,
    );
  }

  if (classes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No classes exist yet.</p>
    );
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="delete-class-pick">Class to delete</Label>
        <select
          id="delete-class-pick"
          value={classId}
          onChange={(e) => {
            setClassId(e.target.value);
            setErr(null);
          }}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Select a class…</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} ({c.submissionCount}{" "}
              {c.submissionCount === 1 ? "submission" : "submissions"})
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <div className="rounded-lg border border-border bg-background/80 px-3 py-2 text-xs text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Join code: </span>
            <code className="font-mono text-foreground">{selected.joinCode}</code>
          </p>
          <p className="mt-1">
            Enter this join code again below, plus the confirmation phrase. Both are checked on the
            server.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="delete-class-code">Join code (exact match)</Label>
        <Input
          id="delete-class-code"
          value={joinCodeInput}
          onChange={(e) => setJoinCodeInput(e.target.value)}
          placeholder="Join code"
          autoComplete="off"
          disabled={!selected || pending}
          className="font-mono"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="delete-class-phrase">Confirmation phrase</Label>
        <Input
          id="delete-class-phrase"
          value={phraseInput}
          onChange={(e) => setPhraseInput(e.target.value)}
          placeholder={PERMANENT_CLASS_DELETE_PHRASE}
          autoComplete="off"
          disabled={!selected || pending}
          className="font-mono"
        />
        <p className="text-xs text-muted-foreground">
          Type exactly: <code className="rounded bg-muted px-1">{PERMANENT_CLASS_DELETE_PHRASE}</code>
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={ack}
          onChange={(e) => setAck(e.target.checked)}
          disabled={!selected || pending}
          className="mt-1 h-4 w-4 rounded border-input accent-foreground"
        />
        <span>
          I understand this permanently deletes the class and all related data. Students and
          instructors will lose access immediately.
        </span>
      </label>

      {err && (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        variant="destructive"
        size="sm"
        disabled={!selected || !ack || pending}
      >
        {pending ? "Deleting…" : "Permanently delete class and all data"}
      </Button>
    </form>
  );
}
