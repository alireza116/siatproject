import { dbConnect } from "@/lib/db/connect";
import { ClassModel } from "@/lib/models/Class";
import { Enrollment } from "@/lib/models/Enrollment";
import type { LeanClassFull, LeanEnrollment } from "@/lib/types/lean";

/** True when the user is enrolled as a student somewhere but has no instructor/owner role in any class. */
export async function isPureStudentUser(userId: string): Promise<boolean> {
  await dbConnect();
  const enrollments = (await Enrollment.find({ userId }).lean()) as unknown as LeanEnrollment[];
  if (enrollments.length === 0) return false;
  const classIds = enrollments.map((e) => e.classId);
  const classes = (await ClassModel.find({ _id: { $in: classIds } }).lean()) as unknown as LeanClassFull[];
  const byId = new Map(classes.map((c) => [c._id.toString(), c]));

  let hasTeaching = false;
  let hasStudent = false;
  for (const e of enrollments) {
    const c = byId.get(e.classId.toString());
    if (!c) continue;
    if (c.ownerId.toString() === userId || e.role === "INSTRUCTOR" || e.role === "ASSISTANT") {
      hasTeaching = true;
    } else if (e.role === "STUDENT") {
      hasStudent = true;
    }
  }
  return hasStudent && !hasTeaching;
}
