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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function PublicSubmissionPage({
  params,
}: {
  params: Promise<{ classId: string; submissionId: string }>;
}) {
  const { classId, submissionId } = await params;
  const data = await getPublicSubmission(classId, submissionId);
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
      <Link
        href={`/gallery/${classId}`}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 mb-2 text-muted-foreground")}
      >
        ← {cls.title}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{sub.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sub.groupName}
            {sub.authorSfuIds?.length > 0 && ` · ${sub.authorSfuIds.join(", ")}`}
          </p>
          <Badge variant="secondary" className="mt-2 text-[10px]">Public</Badge>
        </div>
        {session?.user?.id && isInstructor && (
          <DeleteSubmissionButton
            submissionId={submissionId}
            classId={classId}
            action={deleteSubmissionAction}
          />
        )}
      </div>

      {/* Abstract */}
      {sub.description && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-foreground">Abstract</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {sub.description}
          </p>
        </section>
      )}

      {/* Videos */}
      {(sub.youtubeVideoIds ?? []).length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-foreground">Videos</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {(sub.youtubeVideoIds ?? []).map((id) => (
              <div key={id} className="aspect-video overflow-hidden rounded-xl bg-muted">
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
        </section>
      )}

      {/* Project links */}
      {(sub.projectUrls ?? []).length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-foreground">Project links</h2>
          <ul className="mt-2 space-y-1">
            {(sub.projectUrls ?? []).map((u) => (
              <li key={u}>
                <a
                  href={u}
                  className="text-sm text-foreground underline underline-offset-4 hover:text-muted-foreground"
                  target="_blank"
                  rel="noreferrer"
                >
                  {u}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Separator className="mt-10" />

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
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/" className="underline underline-offset-4 hover:text-foreground">
            Sign in
          </Link>{" "}
          to leave feedback.
        </p>
      )}
    </div>
  );
}
