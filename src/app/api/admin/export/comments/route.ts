import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getClassById } from "@/lib/firestore/classes";
import { listCommentsForSubmissions } from "@/lib/firestore/comments";
import { listSubmissionsByClass } from "@/lib/firestore/submissions";
import { listUsersByIds } from "@/lib/firestore/users";

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

  const cls = await getClassById(classId);
  if (!cls) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  const submissions = await listSubmissionsByClass(classId);
  const submissionIds = submissions.map((s) => s.id);
  const subMap = new Map(submissions.map((s) => [s.id, s]));

  const comments = await listCommentsForSubmissions(submissionIds);

  const userIds = [...new Set(comments.map((c) => c.userId))];
  const users = await listUsersByIds(userIds);
  const userMap = new Map(users.map((u) => [u.id, u]));

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
    const sub = subMap.get(c.submissionId);
    const user = userMap.get(c.userId);
    return csvRow([
      c.id,
      c.submissionId,
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
