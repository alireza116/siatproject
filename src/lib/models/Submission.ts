import mongoose, { type InferSchemaType, type Types } from "mongoose";

const SubmissionSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
      index: true,
    },
    groupName: { type: String, required: true },
    title: { type: String, required: true },
    projectUrls: [{ type: String }],
    youtubeVideoIds: [{ type: String }],
    authorUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    authorNames: [{ type: String }],
    authorSfuIds: [{ type: String }],
    visibility: { type: String, enum: ["PRIVATE", "PUBLIC"], required: false },
    commentsEnabled: { type: Boolean, required: false },
    createdById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

SubmissionSchema.index({ classId: 1, createdAt: -1 });

export type SubmissionDoc = InferSchemaType<typeof SubmissionSchema> & {
  _id: Types.ObjectId;
};

export const Submission =
  mongoose.models.Submission ?? mongoose.model("Submission", SubmissionSchema);
