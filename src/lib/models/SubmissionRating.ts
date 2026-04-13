import mongoose, { type InferSchemaType, type Types } from "mongoose";

const SubmissionRatingSchema = new mongoose.Schema(
  {
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Submission",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    stars: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
  },
  { timestamps: true }
);

SubmissionRatingSchema.index({ submissionId: 1, userId: 1 }, { unique: true });

export type SubmissionRatingDoc = InferSchemaType<typeof SubmissionRatingSchema> & {
  _id: Types.ObjectId;
};

export const SubmissionRating =
  mongoose.models.SubmissionRating ??
  mongoose.model("SubmissionRating", SubmissionRatingSchema);
