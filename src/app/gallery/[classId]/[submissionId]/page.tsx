import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { deleteSubmissionAction } from "@/app/actions/submission";
import { listCommentsForSubmission } from "@/lib/firestore/comments";
import { listUsersByIds } from "@/lib/firestore/users";
import { getPublicSubmission, listPublicSubmissionsForClass } from "@/lib/gallery";
import type { LeanComment, LeanUserPublic } from "@/lib/types/lean";
import { isClassInstructor } from "@/lib/class-access";
import { effectiveCommentsOnPublic, effectiveVisibility } from "@/lib/visibility";
import { CommentsBlock } from "@/components/CommentsBlock";
import { DeleteSubmissionButton } from "@/components/DeleteSubmissionButton";
import { ProjectNav } from "@/components/ProjectNav";
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

  const commentsRaw = await listCommentsForSubmission(submissionId);
  const comments: LeanComment[] = commentsRaw.map((c) => ({
    _id: c.id,
    userId: c.userId,
    body: c.body,
    createdAt: c.createdAt,
  }));
  const hasOwnComment = !!session?.user?.id && comments.some((c) => c.userId === session.user.id);
  const commentIds = comments.map((c) => c._id);
  const voteSummary = await getCommentVoteSummary(commentIds, session?.user?.id);
  const userIds = [...new Set(comments.map((c) => c.userId))];
  const users = await listUsersByIds(userIds);
  const userMap = new Map(users.map((u) => [u.id, u]));

  const vis = effectiveVisibility(sub, cls);
  const commentsOk = effectiveCommentsOnPublic(sub, cls);
  const rating = await getRatingStatsForSubmission(submissionId, session?.user?.id);

  let isInstructor = false;
  if (session?.user?.id) {
    isInstructor = await isClassInstructor(session.user.id, cls._id);
  }

  const allPublicSubs = await listPublicSubmissionsForClass(classId);
  const navIndex = allPublicSubs.findIndex((s) => s._id === submissionId);
  const prevNavSub = navIndex > 0 ? allPublicSubs[navIndex - 1]! : null;
  const nextNavSub = navIndex < allPublicSubs.length - 1 ? allPublicSubs[navIndex + 1]! : null;

  const commentRows = comments.map((c) => {
    const u = userMap.get(c.userId);
    const pub: LeanUserPublic | undefined = u
      ? { _id: u.id, name: u.name, sfuId: u.sfuId }
      : undefined;
    return {
      id: c._id,
      body: c.body,
      createdAt: c.createdAt?.toISOString() ?? "",
      userId: c.userId,
      upvotes: voteSummary.get(c._id)?.upvotes ?? 0,
      downvotes: voteSummary.get(c._id)?.downvotes ?? 0,
      userVote: voteSummary.get(c._id)?.userVote ?? 0,
      userLabel: pub?.sfuId ?? pub?.name ?? "User",
    };
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-10 space-y-8">
        <div>
          <Link
            href={`/gallery/${classId}`}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 inline-flex w-fit max-w-full gap-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
            aria-label={`Back to ${cls.title} gallery`}
          >
            <span aria-hidden className="shrink-0">
              ←
            </span>
            <span className="truncate">{cls.title}</span>
          </Link>
        </div>

        {allPublicSubs.length > 1 && (
          <ProjectNav
            prev={
              prevNavSub
                ? { href: `/gallery/${classId}/${prevNavSub._id}`, title: prevNavSub.title }
                : null
            }
            next={
              nextNavSub
                ? { href: `/gallery/${classId}/${nextNavSub._id}`, title: nextNavSub.title }
                : null
            }
            current={navIndex + 1}
            total={allPublicSubs.length}
          />
        )}
      </header>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{sub.title}</h1>
          {(() => {
            const bits: string[] = [];
            if (cls.publicShowGroupName !== false && sub.groupName) {
              bits.push(sub.groupName);
            }
            if (cls.publicShowAuthorNames !== false && sub.authorNames?.length > 0) {
              bits.push(sub.authorNames.join(", "));
            }
            if (cls.publicShowAuthorSfuIds !== false && sub.authorSfuIds?.length > 0) {
              bits.push(sub.authorSfuIds.join(", "));
            }
            return bits.length > 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">{bits.join(" · ")}</p>
            ) : null;
          })()}
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

      <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_380px]">

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
