import { dbConnect } from "@/lib/db/connect";
import { ClassModel } from "@/lib/models/Class";
import { Submission } from "@/lib/models/Submission";
import { effectiveVisibility } from "@/lib/visibility";
import { leanOne } from "@/lib/mongoose-lean";
import type { LeanClassFull, LeanSubmissionFull } from "@/lib/types/lean";

export type PublicSubmissionListItem = {
  _id: string;
  title: string;
  groupName: string;
  classTitle: string;
  createdAt: Date;
};

export async function listPublicSubmissions(): Promise<PublicSubmissionListItem[]> {
  await dbConnect();
  const subs = (await Submission.find().sort({ createdAt: -1 }).lean()) as unknown as LeanSubmissionFull[];
  const out: PublicSubmissionListItem[] = [];
  for (const s of subs) {
    const cls = leanOne<LeanClassFull>(await ClassModel.findById(s.classId).lean());
    if (!cls) continue;
    if (effectiveVisibility(s, cls) !== "PUBLIC") continue;
    out.push({
      _id: s._id.toString(),
      title: s.title,
      groupName: s.groupName,
      classTitle: cls.title,
      createdAt: s.createdAt,
    });
  }
  return out;
}

export async function getPublicSubmission(submissionId: string): Promise<{
  submission: LeanSubmissionFull;
  class: LeanClassFull;
} | null> {
  await dbConnect();
  const s = leanOne<LeanSubmissionFull>(await Submission.findById(submissionId).lean());
  if (!s) return null;
  const cls = leanOne<LeanClassFull>(await ClassModel.findById(s.classId).lean());
  if (!cls) return null;
  if (effectiveVisibility(s, cls) !== "PUBLIC") return null;
  return { submission: s, class: cls };
}
