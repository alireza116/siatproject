import { listStudentEnrollmentsForClass } from "@/lib/firestore/enrollments";
import { listUsersByIds } from "@/lib/firestore/users";
import { StudentPrivilegesManager } from "./student-privileges-manager";

export async function StudentPrivilegesSection({ classId }: { classId: string }) {
  const enrollments = await listStudentEnrollmentsForClass(classId);

  if (enrollments.length === 0) {
    return (
      <div>
        <h2 className="text-base font-semibold">Student submission privileges</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          New students can edit their own submissions and change public/private by default.
          Deleting is off by default. Adjust per student or in bulk once people join.
        </p>
        <div className="mt-4 rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
          No students enrolled yet.
        </div>
      </div>
    );
  }

  const userIds = enrollments.map((e) => e.userId);
  const users = await listUsersByIds(userIds);
  const userMap = new Map(users.map((u) => [u.id, u]));

  const rows = enrollments.map((e) => {
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

  return <StudentPrivilegesManager classId={classId} rows={rows} />;
}
