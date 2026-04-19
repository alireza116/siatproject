import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getClassById } from "@/lib/firestore/classes";
import { listSubmissionsByClass } from "@/lib/firestore/submissions";

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

  const subs = await listSubmissionsByClass(classId);

  const header = csvRow([
    "submission_id",
    "group_name",
    "title",
    "description",
    "author_sfu_ids",
    "author_names",
    "youtube_video_ids",
    "project_urls",
    "visibility",
    "comments_enabled",
    "created_at",
  ]);

  const rows = subs.map((s) =>
    csvRow([
      s.id,
      s.groupName,
      s.title,
      s.description ?? "",
      (s.authorSfuIds ?? []).join("; "),
      (s.authorNames ?? []).join("; "),
      (s.youtubeVideoIds ?? []).join("; "),
      (s.projectUrls ?? []).join("; "),
      s.visibility ?? cls.defaultVisibility,
      s.commentsEnabled == null ? "" : String(s.commentsEnabled),
      s.createdAt.toISOString(),
    ])
  );

  const csv = [header, ...rows].join("\r\n");
  const filename = `${cls.title.replace(/[^a-z0-9]/gi, "_")}_submissions.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
