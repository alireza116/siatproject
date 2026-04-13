import mongoose, { type InferSchemaType, type Types } from "mongoose";

const CommentVoteSchema = new mongoose.Schema(
  {
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    value: {
      type: Number,
      enum: [-1, 1],
      required: true,
    },
  },
  { timestamps: true }
);

CommentVoteSchema.index({ commentId: 1, userId: 1 }, { unique: true });

export type CommentVoteDoc = InferSchemaType<typeof CommentVoteSchema> & {
  _id: Types.ObjectId;
};

export const CommentVote =
  mongoose.models.CommentVote ?? mongoose.model("CommentVote", CommentVoteSchema);
