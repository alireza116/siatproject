import { listStudentEnrollmentsForClass } from "@/lib/firestore/enrollments";
import { listUsersByIds } from "@/lib/firestore/users";
import { StudentPrivilegeRow } from "./student-privilege-row";

type Row = {
  userId: string;
  label: string;
  studentCanEditSubmissions: boolean;
  studentCanDeleteSubmissions: boolean;
  studentCanChangeVisibility: boolean;
};

export async function StudentPrivilegesSection({ classId }: { classId: string }) {
  const enrollments = await listStudentEnrollmentsForClass(classId);

  if (enrollments.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
        No students enrolled yet. When they join, you can enable editing, deletion, and visibility
        controls per student.
      </div>
    );
  }

  const userIds = enrollments.map((e) => e.userId);
  const users = await listUsersByIds(userIds);
  const userMap = new Map(users.map((u) => [u.id, u]));

  const rows: Row[] = enrollments.map((e) => {
    const u = userMap.get(e.userId);
    const label =
      u?.sfuId && u?.name ? `${u.sfuId} — ${u.name}` : u?.sfuId ?? u?.name ?? e.userId;
    return {
      userId: e.userId,
      label,
      studentCanEditSubmissions: e.studentCanEditSubmissions === true,
      studentCanDeleteSubmissions: e.studentCanDeleteSubmissions === true,
      studentCanChangeVisibility: e.studentCanChangeVisibility === true,
    };
  });

  return (
    <div>
      <h2 className="text-base font-semibold">Student submission privileges</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        By default, students cannot edit, delete, or change public/private settings on their
        submissions. Enable each capability per student when you are ready.
      </p>
      <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
        {rows.map((r) => (
          <StudentPrivilegeRow
            key={r.userId}
            classId={classId}
            userId={r.userId}
            label={r.label}
            studentCanEditSubmissions={r.studentCanEditSubmissions}
            studentCanDeleteSubmissions={r.studentCanDeleteSubmissions}
            studentCanChangeVisibility={r.studentCanChangeVisibility}
          />
        ))}
      </ul>
    </div>
  );
}
