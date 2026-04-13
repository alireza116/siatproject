import { dbConnect } from "@/lib/db/connect";
import { ClassModel } from "@/lib/models/Class";
import { Submission } from "@/lib/models/Submission";
import { effectiveVisibility } from "@/lib/visibility";
import { leanOne } from "@/lib/mongoose-lean";
import type { LeanClassFull, LeanSubmissionFull } from "@/lib/types/lean";
import type { Types } from "mongoose";

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

  // Use aggregation to avoid loading all submissions into memory.
  // A submission is public if its own visibility is PUBLIC, or if it has no
  // visibility override and the class default is PUBLIC.
  const results = (await Submission.aggregate([
    {
      $lookup: {
        from: "classes",
        localField: "classId",
        foreignField: "_id",
        as: "cls",
      },
    },
    { $unwind: "$cls" },
    {
      $match: {
        $or: [
          { visibility: "PUBLIC" },
          {
            $and: [
              { $or: [{ visibility: { $exists: false } }, { visibility: null }] },
              { "cls.defaultVisibility": "PUBLIC" },
            ],
          },
        ],
      },
    },
    {
      $group: {
        _id: "$classId",
        publicCount: { $sum: 1 },
        classTitle: { $first: "$cls.title" },
        classDescription: { $first: "$cls.description" },
      },
    },
    { $sort: { classTitle: 1 } },
  ])) as { _id: Types.ObjectId; publicCount: number; classTitle: string; classDescription?: string }[];

  return results.map((r) => ({
    _id: r._id.toString(),
    title: r.classTitle,
    description: r.classDescription,
    publicCount: r.publicCount,
  }));
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
