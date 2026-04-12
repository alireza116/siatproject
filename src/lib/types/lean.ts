import type { Types } from "mongoose";

/** Narrow Mongoose `.lean()` results for submissions in server actions */
export type LeanSubmission = {
  _id: Types.ObjectId;
  classId: Types.ObjectId;
  visibility?: "PRIVATE" | "PUBLIC";
  commentsEnabled?: boolean;
};

export type LeanClass = {
  _id: Types.ObjectId;
  defaultVisibility: "PRIVATE" | "PUBLIC";
  commentsOnPublic: boolean;
};

export type LeanClassFull = LeanClass & {
  title: string;
  description?: string;
  joinCode: string;
  ownerId: Types.ObjectId;
};

export type LeanSubmissionFull = LeanSubmission & {
  title: string;
  groupName: string;
  description?: string;
  projectUrls: string[];
  youtubeVideoIds: string[];
  authorUserIds?: Types.ObjectId[];
  authorNames: string[];
  authorSfuIds: string[];
  createdById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type LeanEnrollment = {
  _id: Types.ObjectId;
  classId: Types.ObjectId;
  userId: Types.ObjectId;
  role: string;
  createdAt?: Date;
  studentCanEditSubmissions?: boolean;
  studentCanDeleteSubmissions?: boolean;
  studentCanChangeVisibility?: boolean;
};

export type LeanUser = {
  _id: Types.ObjectId;
  sfuId?: string;
  name?: string;
  email?: string;
  image?: string;
  role?: string;
};

export type LeanComment = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  body: string;
  createdAt?: Date;
};

export type LeanUserPublic = {
  _id: Types.ObjectId;
  name?: string;
  sfuId?: string;
};
