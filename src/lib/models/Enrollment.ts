import mongoose, { type InferSchemaType, type Types } from "mongoose";

const EnrollmentSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["STUDENT", "ASSISTANT", "INSTRUCTOR"],
      default: "STUDENT",
    },
  },
  { timestamps: true }
);

EnrollmentSchema.index({ classId: 1, userId: 1 }, { unique: true });

export type EnrollmentDoc = InferSchemaType<typeof EnrollmentSchema> & {
  _id: Types.ObjectId;
};

export const Enrollment =
  mongoose.models.Enrollment ?? mongoose.model("Enrollment", EnrollmentSchema);
