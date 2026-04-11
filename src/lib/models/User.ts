import mongoose, { type InferSchemaType } from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, index: true },
    name: { type: String },
    image: { type: String },
    sfuId: { type: String, sparse: true, unique: true },
    casUsername: { type: String, sparse: true, unique: true },
    googleSub: { type: String, sparse: true, unique: true },
    role: { type: String, enum: ["USER", "GLOBAL_ADMIN"], default: "USER" },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: string };

export const User =
  mongoose.models.User ?? mongoose.model("User", UserSchema);
