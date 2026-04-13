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
import { ProjectNav } from "@/components/ProjectNav";
import { listPublicSubmissionsForClass } from "@/lib/gallery";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCommentVoteSummary, getRatingStatsForSubmission } from "@/lib/feedback";

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
  const hasOwnComment = !!session?.user?.id && comments.some((c) => c.userId.toString() === session.user.id);
  const commentIds = comments.map((c) => c._id.toString());
  const voteSummary = await getCommentVoteSummary(commentIds, session?.user?.id);
  const userIds = [...new Set(comments.map((c) => c.userId.toString()))];
  const users = (await User.find({ _id: { $in: userIds } })
    .select("name sfuId")
    .lean()) as unknown as LeanUserPublic[];
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const vis = effectiveVisibility(sub, cls);
  const commentsOk = effectiveCommentsOnPublic(sub, cls);
  const rating = await getRatingStatsForSubmission(submissionId, session?.user?.id);

  let isInstructor = false;
  if (session?.user?.id) {
    isInstructor = await isClassInstructor(session.user.id, cls._id.toString());
  }

  // Navigation: ordered list of public submissions in this class
  const allPublicSubs = await listPublicSubmissionsForClass(classId);
  const navIndex = allPublicSubs.findIndex((s) => s._id === submissionId);
  const prevNavSub = navIndex > 0 ? allPublicSubs[navIndex - 1] : null;
  const nextNavSub = navIndex < allPublicSubs.length - 1 ? allPublicSubs[navIndex + 1] : null;

  const commentRows = comments.map((c) => ({
    id: c._id.toString(),
    body: c.body,
    createdAt: c.createdAt?.toISOString() ?? "",
    userId: c.userId.toString(),
    upvotes: voteSummary.get(c._id.toString())?.upvotes ?? 0,
    downvotes: voteSummary.get(c._id.toString())?.downvotes ?? 0,
    userVote: voteSummary.get(c._id.toString())?.userVote ?? 0,
    userLabel:
      userMap.get(c.userId.toString())?.sfuId ??
      userMap.get(c.userId.toString())?.name ??
      "User",
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Link
        href={`/gallery/${classId}`}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 text-muted-foreground")}
      >
        ← {cls.title}
      </Link>

      {allPublicSubs.length > 1 && (
        <ProjectNav
          prev={prevNavSub ? { href: `/gallery/${classId}/${prevNavSub._id}`, title: prevNavSub.title } : null}
          next={nextNavSub ? { href: `/gallery/${classId}/${nextNavSub._id}`, title: nextNavSub.title } : null}
          current={navIndex + 1}
          total={allPublicSubs.length}
        />
      )}

      {/* Title row */}
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

      {/* Two-column layout: project content left, feedback right */}
      <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_380px]">

        {/* ── Left column: project content ── */}
        <div className="min-w-0">
          {sub.description && (
            <section>
              <h2 className="text-sm font-semibold text-foreground">Abstract</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {sub.description}
              </p>
            </section>
          )}

          {(sub.youtubeVideoIds ?? []).length > 0 && (
            <section className={sub.description ? "mt-8" : ""}>
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
        </div>

        {/* ── Right column: feedback (sticky + scrollable) ── */}
        <aside className="lg:sticky lg:top-[4.5rem] lg:self-start">
          <div className="lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto lg:rounded-xl lg:border lg:border-border lg:bg-card lg:px-5 lg:py-5">
            <CommentsBlock
              submissionId={submissionId}
              comments={commentRows}
              canComment={vis === "PUBLIC" && commentsOk && !!session?.user?.id}
              canRate={!!session?.user?.id}
              hasOwnComment={hasOwnComment}
              signedInUserId={session?.user?.id ?? ""}
              isInstructor={isInstructor}
              ratingAverage={rating.average}
              ratingCount={rating.count}
              userRating={rating.userRating}
            />
            {!session?.user?.id && commentsOk && (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                <Link href="/" className="underline underline-offset-4 hover:text-foreground">
                  Sign in
                </Link>{" "}
                to leave feedback.
              </p>
            )}
          </div>
        </aside>

      </div>
    </div>
  );
}
