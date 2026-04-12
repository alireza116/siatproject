"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateStudentEnrollmentPrivilegesAction } from "@/app/actions/enrollment-privileges";
import { Button } from "@/components/ui/button";

type Props = {
  classId: string;
  userId: string;
  label: string;
  studentCanEditSubmissions: boolean;
  studentCanDeleteSubmissions: boolean;
  studentCanChangeVisibility: boolean;
};

export function StudentPrivilegeRow({
  classId,
  userId,
  label,
  studentCanEditSubmissions,
  studentCanDeleteSubmissions,
  studentCanChangeVisibility,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <li className="px-4 py-4">
      <form
        className="space-y-4"
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
        <input type="hidden" name="studentUserId" value={userId} />
        <p className="text-sm font-medium text-foreground">{label}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="studentCanEditSubmissions"
              value="on"
              defaultChecked={studentCanEditSubmissions}
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
              name="studentCanDeleteSubmissions"
              value="on"
              defaultChecked={studentCanDeleteSubmissions}
              className="mt-0.5 h-4 w-4 rounded border-input accent-foreground"
            />
            <span>
              <span className="font-medium text-foreground">Delete own</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Remove their submission
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="studentCanChangeVisibility"
              value="on"
              defaultChecked={studentCanChangeVisibility}
              className="mt-0.5 h-4 w-4 rounded border-input accent-foreground"
            />
            <span>
              <span className="font-medium text-foreground">Visibility</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Public / private & comment toggle
              </span>
            </span>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" variant="secondary" disabled={pending}>
            {pending ? "Saving…" : "Save for this student"}
          </Button>
          <span className="text-xs text-muted-foreground">
            Applies only to submissions they author in this class.
          </span>
        </div>
      </form>
    </li>
  );
}
