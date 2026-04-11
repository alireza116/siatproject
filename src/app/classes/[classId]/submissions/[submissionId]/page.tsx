import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { deleteSubmissionAction } from "@/app/actions/submission";
import { canAccessClass, idEq, isClassInstructor } from "@/lib/class-access";
import { dbConnect } from "@/lib/db/connect";
import { leanOne } from "@/lib/mongoose-lean";
import type {
  LeanClassFull,
  LeanComment,
  LeanSubmissionFull,
  LeanUserPublic,
} from "@/lib/types/lean";
import { ClassModel } from "@/lib/models/Class";
import { Comment } from "@/lib/models/Comment";
import { Submission } from "@/lib/models/Submission";
import { User } from "@/lib/models/User";
import { effectiveCommentsOnPublic, effectiveVisibility } from "@/lib/visibility";
import { SubmissionForm } from "@/components/SubmissionForm";
import { CommentsBlock } from "@/components/CommentsBlock";
import { DeleteSubmissionButton } from "@/components/DeleteSubmissionButton";

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ classId: string; submissionId: string }>;
}) {
  const { classId, submissionId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if (!session.user.sfuId) redirect("/onboarding/sfu-id");

  await dbConnect();
  const sub = leanOne<LeanSubmissionFull>(await Submission.findById(submissionId).lean());
  if (!sub || sub.classId.toString() !== classId) notFound();

  const cls = leanOne<LeanClassFull>(await ClassModel.findById(classId).lean());
  if (!cls) notFound();

  const enrolled = await canAccessClass(session.user.id, classId);
  if (!enrolled) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <p className="text-zinc-600">You are not enrolled in this class.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm underline">
          Dashboard
        </Link>
      </div>
    );
  }

  const instructor = await isClassInstructor(session.user.id, classId);
  const isAuthor =
    sub.authorUserIds?.some((id) => idEq(id, session.user.id)) ||
    idEq(sub.createdById, session.user.id);
  const canEdit = instructor || isAuthor;

  const comments = (await Comment.find({ submissionId: sub._id })
    .sort({ createdAt: 1 })
    .lean()) as unknown as LeanComment[];
  const userIds = [...new Set(comments.map((c) => c.userId.toString()))];
  const users = (await User.find({ _id: { $in: userIds } })
    .select("name sfuId")
    .lean()) as unknown as LeanUserPublic[];
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const vis = effectiveVisibility(sub, cls);
  const commentsOk = effectiveCommentsOnPublic(sub, cls);

  const ytLines = (sub.youtubeVideoIds ?? []).map(
    (id) => `https://www.youtube.com/watch?v=${id}`
  );
  const projectText = (sub.projectUrls ?? []).join("\n");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href={`/classes/${classId}`} className="text-sm text-zinc-600 hover:text-zinc-900">
        ← {cls.title}
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{sub.title}</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {sub.groupName} · {sub.authorSfuIds?.join(", ")}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Visibility: {vis}
            {vis === "PUBLIC" && (
              <> · Public comments: {commentsOk ? "on" : "off"}</>
            )}
          </p>
        </div>
        {instructor && (
          <DeleteSubmissionButton
            submissionId={submissionId}
            classId={classId}
            action={deleteSubmissionAction}
          />
        )}
      </div>

      <section className="mt-8 rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-zinc-900">Videos</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(sub.youtubeVideoIds ?? []).map((id) => (
            <div key={id} className="aspect-video overflow-hidden rounded-md bg-zinc-900">
              <iframe
                title={`YouTube ${id}`}
                className="h-full w-full"
                src={`https://www.youtube.com/embed/${id}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ))}
        </div>
        <h2 className="mt-8 text-sm font-semibold text-zinc-900">Project links</h2>
        <ul className="mt-2 list-inside list-disc text-sm text-zinc-800">
          {(sub.projectUrls ?? []).map((u) => (
            <li key={u}>
              <a href={u} className="underline" target="_blank" rel="noreferrer">
                {u}
              </a>
            </li>
          ))}
        </ul>
      </section>

      {canEdit && (
        <section className="mt-10 rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-medium">Edit submission</h2>
          <SubmissionForm
            mode="edit"
            classId={classId}
            submissionId={submissionId}
            showVisibility
            initial={{
              title: sub.title,
              groupName: sub.groupName,
              projectUrls: projectText,
              youtubeUrls: ytLines.join("\n"),
              visibility: sub.visibility ?? cls.defaultVisibility,
              commentsEnabled: sub.commentsEnabled ?? cls.commentsOnPublic,
            }}
          />
        </section>
      )}

      <CommentsBlock
        submissionId={submissionId}
        comments={comments.map((c) => ({
          id: c._id.toString(),
          body: c.body,
          createdAt: c.createdAt?.toISOString() ?? "",
          userId: c.userId.toString(),
          userLabel:
            userMap.get(c.userId.toString())?.sfuId ??
            userMap.get(c.userId.toString())?.name ??
            "User",
        }))}
        canComment={vis === "PRIVATE" || commentsOk}
        signedInUserId={session.user.id}
        isInstructor={instructor}
      />
    </div>
  );
}
