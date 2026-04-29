import Link from "next/link";
import { deleteSubmissionAction } from "@/app/actions/submission";
import { CommentsBlock } from "@/components/CommentsBlock";
import { DeleteSubmissionButton } from "@/components/DeleteSubmissionButton";
import { ProjectNav } from "@/components/ProjectNav";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PublicSubmissionPagePayload } from "@/lib/gallery-public-submission-page";

type Props = {
  payload: PublicSubmissionPagePayload;
  galleryBasePath: string;
  asideStickyClassName: string;
  asideScrollMaxClassName: string;
};

export function PublicSubmissionPageView({
  payload,
  galleryBasePath,
  asideStickyClassName,
  asideScrollMaxClassName,
}: Props) {
  const {
    classId,
    submissionId,
    data,
    commentRows,
    hasOwnComment,
    vis,
    commentsOk,
    rating,
    isInstructor,
    sessionUserId,
    prevNavSub,
    nextNavSub,
    navIndex,
    totalPublic,
  } = payload;
  const { submission: sub, class: cls } = data;
  const classListHref = `${galleryBasePath}/${classId}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-10 space-y-8">
        <div>
          <Link
            href={classListHref}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 inline-flex w-fit max-w-full gap-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
            aria-label={`Back to ${cls.title} projects`}
          >
            <span aria-hidden className="shrink-0">
              ←
            </span>
            <span className="truncate">{cls.title}</span>
          </Link>
        </div>

        {totalPublic > 1 && (
          <ProjectNav
            prev={
              prevNavSub
                ? {
                    href: `${galleryBasePath}/${classId}/${prevNavSub._id}`,
                    title: prevNavSub.title,
                  }
                : null
            }
            next={
              nextNavSub
                ? {
                    href: `${galleryBasePath}/${classId}/${nextNavSub._id}`,
                    title: nextNavSub.title,
                  }
                : null
            }
            current={navIndex + 1}
            total={totalPublic}
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
          <Badge variant="secondary" className="mt-2 text-[10px]">
            Public
          </Badge>
        </div>
        {sessionUserId && isInstructor && (
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
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
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

        <aside className={cn("lg:sticky lg:self-start", asideStickyClassName)}>
          <div
            className={cn(
              "lg:overflow-y-auto lg:rounded-xl lg:border lg:border-border lg:bg-card lg:px-5 lg:py-5",
              asideScrollMaxClassName
            )}
          >
            <CommentsBlock
              submissionId={submissionId}
              comments={commentRows}
              canComment={vis === "PUBLIC" && commentsOk && !!sessionUserId}
              canRate={!!sessionUserId}
              hasOwnComment={hasOwnComment}
              signedInUserId={sessionUserId ?? ""}
              isInstructor={isInstructor}
              ratingAverage={rating.average}
              ratingCount={rating.count}
              userRating={rating.userRating}
            />
            {!sessionUserId && commentsOk && (
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
