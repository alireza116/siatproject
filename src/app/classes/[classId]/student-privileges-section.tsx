import { dbConnect } from "@/lib/db/connect";
import { Enrollment } from "@/lib/models/Enrollment";
import { User } from "@/lib/models/User";
import type { LeanEnrollment } from "@/lib/types/lean";
import { StudentPrivilegeRow } from "./student-privilege-row";

type Row = {
  userId: string;
  label: string;
  studentCanEditSubmissions: boolean;
  studentCanDeleteSubmissions: boolean;
  studentCanChangeVisibility: boolean;
};

type LeanUserBrief = { _id: { toString(): string }; sfuId?: string; name?: string };

export async function StudentPrivilegesSection({ classId }: { classId: string }) {
  await dbConnect();
  const enrollments = (await Enrollment.find({ classId, role: "STUDENT" })
    .sort({ createdAt: 1 })
    .lean()) as unknown as LeanEnrollment[];

  if (enrollments.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
        No students enrolled yet. When they join, you can enable editing, deletion, and visibility
        controls per student.
      </div>
    );
  }

  const userIds = enrollments.map((e) => e.userId);
  const users = (await User.find({ _id: { $in: userIds } })
    .select("name sfuId")
    .lean()) as unknown as LeanUserBrief[];
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const rows: Row[] = enrollments.map((e) => {
    const u = userMap.get(e.userId.toString());
    const label =
      u?.sfuId && u?.name ? `${u.sfuId} — ${u.name}` : u?.sfuId ?? u?.name ?? e.userId.toString();
    return {
      userId: e.userId.toString(),
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
