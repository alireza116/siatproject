import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { deleteSubmissionAction } from "@/app/actions/submission";
import { dbConnect } from "@/lib/db/connect";
import { Comment } from "@/lib/models/Comment";
import { User } from "@/lib/models/User";
import { getPublicSubmission } from "@/lib/gallery";
import type { LeanComment, LeanUserPublic } from "@/lib/types/lean";
import { isClassInstructor } from "@/lib/class-access";
import { effectiveCommentsOnPublic, effectiveVisibility } from "@/lib/visibility";
import { CommentsBlock } from "@/components/CommentsBlock";
import { DeleteSubmissionButton } from "@/components/DeleteSubmissionButton";

export default async function PublicSubmissionPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;
  const data = await getPublicSubmission(submissionId);
  if (!data) notFound();

  const { submission: sub, class: cls } = data;
  const session = await auth();

  await dbConnect();
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

  let isInstructor = false;
  if (session?.user?.id) {
    isInstructor = await isClassInstructor(session.user.id, cls._id.toString());
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/gallery" className="text-sm text-zinc-600 hover:text-zinc-900">
        ← Gallery
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{sub.title}</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {cls.title} · {sub.groupName} · {sub.authorSfuIds?.join(", ")}
          </p>
        </div>
        {session?.user?.id && isInstructor && (
          <DeleteSubmissionButton
            submissionId={submissionId}
            classId={cls._id.toString()}
            action={deleteSubmissionAction}
          />
        )}
      </div>

      <section className="mt-8 rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold">Videos</h2>
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
        <h2 className="mt-8 text-sm font-semibold">Project links</h2>
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
        canComment={vis === "PUBLIC" && commentsOk && !!session?.user?.id}
        signedInUserId={session?.user?.id ?? ""}
        isInstructor={isInstructor}
      />

      {!session?.user?.id && commentsOk && (
        <p className="mt-4 text-center text-sm text-zinc-500">
          <Link href="/" className="text-red-800 underline">
            Sign in
          </Link>{" "}
          to leave feedback.
        </p>
      )}
    </div>
  );
}
