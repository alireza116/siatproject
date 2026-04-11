import mongoose, { type InferSchemaType, type Types } from "mongoose";

const CommentSchema = new mongoose.Schema(
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
    body: { type: String, required: true, maxlength: 8000 },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      required: false,
    },
  },
  { timestamps: true }
);

CommentSchema.index({ submissionId: 1, createdAt: 1 });

export type CommentDoc = InferSchemaType<typeof CommentSchema> & {
  _id: Types.ObjectId;
};

export const Comment =
  mongoose.models.Comment ?? mongoose.model("Comment", CommentSchema);
