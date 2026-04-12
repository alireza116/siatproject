import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db/connect";
import { ClassModel } from "@/lib/models/Class";
import { Comment } from "@/lib/models/Comment";
import { Submission } from "@/lib/models/Submission";
import { User } from "@/lib/models/User";

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function csvRow(cells: unknown[]): string {
  return cells.map(csvCell).join(",");
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "GLOBAL_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const classId = req.nextUrl.searchParams.get("classId");
  if (!classId) {
    return NextResponse.json({ error: "classId is required" }, { status: 400 });
  }

  await dbConnect();

  const cls = (await ClassModel.findById(classId).select("_id title").lean()) as unknown as {
    _id: { toString(): string };
    title: string;
  } | null;
  if (!cls) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  // Find all submissions for this class, then all comments on those submissions
  const submissions = (await Submission.find({ classId })
    .select("_id title groupName")
    .lean()) as unknown as { _id: { toString(): string }; title: string; groupName: string }[];

  const submissionIds = submissions.map((s) => s._id.toString());
  const subMap = new Map(submissions.map((s) => [s._id.toString(), s]));

  const comments = (await Comment.find({ submissionId: { $in: submissionIds } })
    .sort({ submissionId: 1, createdAt: 1 })
    .lean()) as unknown as {
    _id: { toString(): string };
    submissionId: { toString(): string };
    userId: { toString(): string };
    body: string;
    createdAt: Date;
  }[];

  const userIds = [...new Set(comments.map((c) => c.userId.toString()))];
  const users = (await User.find({ _id: { $in: userIds } })
    .select("_id sfuId name")
    .lean()) as unknown as { _id: { toString(): string }; sfuId?: string; name?: string }[];
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const header = csvRow([
    "comment_id",
    "submission_id",
    "submission_title",
    "group_name",
    "commenter_sfu_id",
    "commenter_name",
    "body",
    "created_at",
  ]);

  const rows = comments.map((c) => {
    const sub = subMap.get(c.submissionId.toString());
    const user = userMap.get(c.userId.toString());
    return csvRow([
      c._id.toString(),
      c.submissionId.toString(),
      sub?.title ?? "",
      sub?.groupName ?? "",
      user?.sfuId ?? "",
      user?.name ?? "",
      c.body,
      c.createdAt.toISOString(),
    ]);
  });

  const csv = [header, ...rows].join("\r\n");
  const filename = `${cls.title.replace(/[^a-z0-9]/gi, "_")}_comments.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
