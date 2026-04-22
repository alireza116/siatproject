"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { removeStudentAction } from "@/app/actions/class";
import {
  bulkUpdateStudentEnrollmentPrivilegesAction,
  resetStudentPrivilegesToDefaultsAction,
  updateStudentEnrollmentPrivilegesAction,
} from "@/app/actions/enrollment-privileges";
import { Button } from "@/components/ui/button";

export type StudentRow = {
  userId: string;
  label: string;
  studentCanEditSubmissions: boolean;
  studentCanDeleteSubmissions: boolean;
  studentCanChangeVisibility: boolean;
};

type Props = {
  classId: string;
  rows: StudentRow[];
};

export function StudentPrivilegesManager({ classId, rows }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkEdit, setBulkEdit] = useState(true);
  const [bulkChangeVis, setBulkChangeVis] = useState(true);
  const [bulkDelete, setBulkDelete] = useState(false);
  const [pending, setPending] = useState<null | "selected" | "all" | "defaults">(null);

  const allSelected = selected.size > 0 && selected.size === rows.length;
  const selectedIds = useMemo(() => [...selected], [selected]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.userId)));
  }

  async function applyBulk(scope: "selected" | "all") {
    if (scope === "selected" && selected.size === 0) return;
    setPending(scope);
    const fd = new FormData();
    fd.set("classId", classId);
    fd.set("scope", scope);
    if (scope === "selected") {
      for (const id of selectedIds) fd.append("studentUserIds", id);
    }
    if (bulkEdit) fd.set("studentCanEditSubmissions", "on");
    if (bulkDelete) fd.set("studentCanDeleteSubmissions", "on");
    if (bulkChangeVis) fd.set("studentCanChangeVisibility", "on");
    const r = await bulkUpdateStudentEnrollmentPrivilegesAction(fd);
    setPending(null);
    if (!r.ok) {
      alert(r.error);
      return;
    }
    setSelected(new Set());
    router.refresh();
  }

  async function resetAllToDefaults() {
    if (!confirm("Reset every student to the class defaults (edit + visibility on, delete off)?")) return;
    setPending("defaults");
    const fd = new FormData();
    fd.set("classId", classId);
    const r = await resetStudentPrivilegesToDefaultsAction(fd);
    setPending(null);
    if (!r.ok) {
      alert(r.error);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Student submission privileges</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Students can edit their own content and change public/private by default. Deleting is
            off by default. Revoke or re-grant per student, or use the bulk panel below.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={resetAllToDefaults}
          disabled={pending !== null}
        >
          {pending === "defaults" ? "Resetting…" : "Reset all to defaults"}
        </Button>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground">Bulk update</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose the permissions below, then apply them to the students you&apos;ve selected in the
          list or to the whole class at once.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={bulkEdit}
              onChange={(e) => setBulkEdit(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input accent-foreground"
            />
            <span>
              <span className="font-medium text-foreground">Edit content</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Title, abstract, videos, links
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={bulkChangeVis}
              onChange={(e) => setBulkChangeVis(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input accent-foreground"
            />
            <span>
              <span className="font-medium text-foreground">Visibility</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Public / private &amp; comment toggle
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={bulkDelete}
              onChange={(e) => setBulkDelete(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input accent-foreground"
            />
            <span>
              <span className="font-medium text-foreground">Delete own</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Remove their submission
              </span>
            </span>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => applyBulk("selected")}
            disabled={pending !== null || selected.size === 0}
          >
            {pending === "selected"
              ? "Applying…"
              : `Apply to selected${selected.size > 0 ? ` (${selected.size})` : ""}`}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => applyBulk("all")}
            disabled={pending !== null}
          >
            {pending === "all" ? "Applying…" : `Apply to all students (${rows.length})`}
          </Button>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
        <li className="flex items-center gap-3 bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-input accent-foreground"
            aria-label="Select all students"
          />
          <span>
            {selected.size > 0
              ? `${selected.size} selected`
              : "Select students to apply bulk changes"}
          </span>
        </li>
        {rows.map((r) => (
          <StudentRow
            key={r.userId}
            classId={classId}
            row={r}
            selected={selected.has(r.userId)}
            onToggle={() => toggle(r.userId)}
          />
        ))}
      </ul>
    </div>
  );
}

function StudentRow({
  classId,
  row,
  selected,
  onToggle,
}: {
  classId: string;
  row: StudentRow;
  selected: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [removePending, setRemovePending] = useState(false);

  return (
    <li className="flex items-start gap-3 px-4 py-4">
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="mt-1 h-4 w-4 shrink-0 rounded border-input accent-foreground"
        aria-label={`Select ${row.label}`}
      />
      <form
        className="flex-1 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          const fd = new FormData(e.currentTarget);
          const r = await updateStudentEnrollmentPrivilegesAction(fd);
          setPending(false);
          if (!r.ok) {
            alert(r.error);
            return;
          }
          router.refresh();
        }}
      >
        <input type="hidden" name="classId" value={classId} />
        <input type="hidden" name="studentUserId" value={row.userId} />
        <p className="text-sm font-medium text-foreground">{row.label}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="studentCanEditSubmissions"
              value="on"
              defaultChecked={row.studentCanEditSubmissions}
              className="mt-0.5 h-4 w-4 rounded border-input accent-foreground"
            />
            <span>
              <span className="font-medium text-foreground">Edit content</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Title, abstract, videos, links
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="studentCanChangeVisibility"
              value="on"
              defaultChecked={row.studentCanChangeVisibility}
              className="mt-0.5 h-4 w-4 rounded border-input accent-foreground"
            />
            <span>
              <span className="font-medium text-foreground">Visibility</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Public / private &amp; comment toggle
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="studentCanDeleteSubmissions"
              value="on"
              defaultChecked={row.studentCanDeleteSubmissions}
              className="mt-0.5 h-4 w-4 rounded border-input accent-foreground"
            />
            <span>
              <span className="font-medium text-foreground">Delete own</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Remove their submission
              </span>
            </span>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="sm" variant="secondary" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="ml-auto text-xs text-muted-foreground hover:text-destructive"
            disabled={removePending}
            onClick={async () => {
              if (!confirm(`Remove ${row.label} from this class?`)) return;
              setRemovePending(true);
              const r = await removeStudentAction(classId, row.userId);
              setRemovePending(false);
              if (!r.ok) {
                alert(r.error);
                return;
              }
              router.refresh();
            }}
          >
            {removePending ? "Removing…" : "Remove from class"}
          </Button>
        </div>
      </form>
    </li>
  );
}
