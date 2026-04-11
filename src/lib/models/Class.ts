import mongoose, { type InferSchemaType, type Types } from "mongoose";

const ClassSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    joinCode: { type: String, required: true, unique: true, index: true },
    description: { type: String },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    defaultVisibility: {
      type: String,
      enum: ["PRIVATE", "PUBLIC"],
      default: "PRIVATE",
    },
    commentsOnPublic: { type: Boolean, default: true },
    allowGroupSubmissions: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type ClassDoc = InferSchemaType<typeof ClassSchema> & {
  _id: Types.ObjectId;
};

export const ClassModel =
  mongoose.models.Class ?? mongoose.model("Class", ClassSchema);
