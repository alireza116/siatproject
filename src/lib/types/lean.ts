/** Lean document shapes returned from Firestore reads (IDs are strings). */

export type LeanSubmission = {
  _id: string;
  classId: string;
  visibility?: "PRIVATE" | "PUBLIC";
  commentsEnabled?: boolean;
};

export type LeanClass = {
  _id: string;
  defaultVisibility: "PRIVATE" | "PUBLIC";
  commentsOnPublic: boolean;
  /** Show the project's group name on public gallery pages. Defaults to true. */
  publicShowGroupName?: boolean;
  /** Show authors' real names on public gallery pages. Defaults to true. */
  publicShowAuthorNames?: boolean;
  /** Show authors' SFU computing IDs on public gallery pages. Defaults to true. */
  publicShowAuthorSfuIds?: boolean;
};

export type LeanClassFull = LeanClass & {
  title: string;
  description?: string;
  joinCode: string;
  ownerId: string;
};

export type LeanSubmissionFull = LeanSubmission & {
  title: string;
  groupName: string;
  description?: string;
  projectUrls: string[];
  youtubeVideoIds: string[];
  authorUserIds?: string[];
  authorNames: string[];
  authorSfuIds: string[];
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
};

export type LeanEnrollment = {
  _id: string;
  classId: string;
  userId: string;
  role: string;
  createdAt?: Date;
  studentCanEditSubmissions?: boolean;
  studentCanDeleteSubmissions?: boolean;
  studentCanChangeVisibility?: boolean;
};

export type LeanUser = {
  _id: string;
  sfuId?: string;
  name?: string;
  displayName?: string;
  email?: string;
  image?: string;
  role?: string;
};

export type LeanComment = {
  _id: string;
  userId: string;
  body: string;
  createdAt?: Date;
};

export type LeanUserPublic = {
  _id: string;
  name?: string;
  sfuId?: string;
};
