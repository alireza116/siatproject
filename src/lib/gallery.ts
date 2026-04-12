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
  firstYoutubeId?: string;
  createdAt: Date;
};

export type PublicClassListItem = {
  _id: string;
  title: string;
  description?: string;
  publicCount: number;
};

/** List all classes that have at least one publicly visible submission. */
export async function listClassesWithPublicSubmissions(): Promise<PublicClassListItem[]> {
  await dbConnect();
  const subs = (await Submission.find().lean()) as unknown as LeanSubmissionFull[];

  const classIds = [...new Set(subs.map((s) => s.classId.toString()))];
  const classes = (await ClassModel.find({ _id: { $in: classIds } }).lean()) as unknown as LeanClassFull[];
  const classMap = new Map(classes.map((c) => [c._id.toString(), c]));

  const counts = new Map<string, number>();
  for (const s of subs) {
    const cls = classMap.get(s.classId.toString());
    if (!cls) continue;
    if (effectiveVisibility(s, cls) !== "PUBLIC") continue;
    counts.set(s.classId.toString(), (counts.get(s.classId.toString()) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([id, publicCount]) => {
      const cls = classMap.get(id)!;
      return { _id: id, title: cls.title, description: cls.description, publicCount };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

/** List all publicly visible submissions for a single class. */
export async function listPublicSubmissionsForClass(
  classId: string
): Promise<PublicSubmissionListItem[]> {
  await dbConnect();
  const cls = leanOne<LeanClassFull>(await ClassModel.findById(classId).lean());
  if (!cls) return [];

  const subs = (await Submission.find({ classId })
    .sort({ createdAt: -1 })
    .lean()) as unknown as LeanSubmissionFull[];

  return subs
    .filter((s) => effectiveVisibility(s, cls) === "PUBLIC")
    .map((s) => ({
      _id: s._id.toString(),
      title: s.title,
      groupName: s.groupName,
      classTitle: cls.title,
      firstYoutubeId: s.youtubeVideoIds?.[0],
      createdAt: s.createdAt,
    }));
}

/** Fetch a single submission, verifying it belongs to classId and is publicly visible. */
export async function getPublicSubmission(
  classId: string,
  submissionId: string
): Promise<{ submission: LeanSubmissionFull; class: LeanClassFull } | null> {
  await dbConnect();
  const s = leanOne<LeanSubmissionFull>(await Submission.findById(submissionId).lean());
  if (!s) return null;
  if (s.classId.toString() !== classId) return null;
  const cls = leanOne<LeanClassFull>(await ClassModel.findById(classId).lean());
  if (!cls) return null;
  if (effectiveVisibility(s, cls) !== "PUBLIC") return null;
  return { submission: s, class: cls };
}
