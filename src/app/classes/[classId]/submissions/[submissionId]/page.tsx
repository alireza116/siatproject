import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isSubmissionAuthor, canStudentViewSubmissionInClass } from "@/lib/submission-access";
import { auth } from "@/auth";
import { deleteSubmissionAction } from "@/app/actions/submission";
import {
  canAccessClassOrGlobalAdmin,
  getStudentSubmissionPrivileges,
  isClassAppManager,
} from "@/lib/class-access";
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
import { ProjectNav } from "@/components/ProjectNav";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getViewAsUserId } from "@/lib/view-as";
import { getCommentVoteSummary, getRatingStatsForSubmission } from "@/lib/feedback";

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ classId: string; submissionId: string }>;
}) {
  const { classId, submissionId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if (!session.user.sfuId) redirect("/onboarding/sfu-id");

  const viewAsUserId = await getViewAsUserId(session.user.role);
  const effectiveUserId = viewAsUserId ?? session.user.id;

  await dbConnect();
  const sub = leanOne<LeanSubmissionFull>(await Submission.findById(submissionId).lean());
  if (!sub || sub.classId.toString() !== classId) notFound();

  const cls = leanOne<LeanClassFull>(await ClassModel.findById(classId).lean());
  if (!cls) notFound();

  const enrolled = await canAccessClassOrGlobalAdmin(effectiveUserId, classId, {
    isGlobalAdmin: !viewAsUserId && session.user.role === "GLOBAL_ADMIN",
  });
  if (!enrolled) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-muted-foreground">You are not enrolled in this class.</p>
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}
        >
          Dashboard
        </Link>
      </div>
    );
  }

  const classManager =
    !viewAsUserId &&
    (await isClassAppManager(session.user.id, classId, {
      globalRole: session.user.role,
      viewAsActive: false,
    }));
  const canView =
    classManager || canStudentViewSubmissionInClass(sub, cls, effectiveUserId);
  if (!canView) notFound();

  const isAuthor = !viewAsUserId && isSubmissionAuthor(sub, effectiveUserId);
  const studentPriv = await getStudentSubmissionPrivileges(effectiveUserId, classId);
  const canEditContent = classManager || (isAuthor && studentPriv.canEditSubmissions);
  const canChangeVisUI = classManager || (isAuthor && studentPriv.canChangeVisibility);
  const canDeleteSubmission =
    classManager || (isAuthor && studentPriv.canDeleteSubmissions);

  const comments = (await Comment.find({ submissionId: sub._id })
    .sort({ createdAt: 1 })
    .lean()) as unknown as LeanComment[];
  const hasOwnComment = comments.some((c) => c.userId.toString() === effectiveUserId);
  const commentIds = comments.map((c) => c._id.toString());
  const voteSummary = await getCommentVoteSummary(commentIds, session.user.id);
  const userIds = [...new Set(comments.map((c) => c.userId.toString()))];
  const users = (await User.find({ _id: { $in: userIds } })
    .select("name sfuId")
    .lean()) as unknown as LeanUserPublic[];
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const vis = effectiveVisibility(sub, cls);
  const commentsOk = effectiveCommentsOnPublic(sub, cls);
  const rating = await getRatingStatsForSubmission(submissionId, session.user.id);

  // Navigation: ordered list of submissions visible to this user
  const allSubsForNav = (await Submission.find({ classId: cls._id })
    .sort({ createdAt: -1 })
    .select("_id title authorUserIds createdById")
    .lean()) as unknown as LeanSubmissionFull[];
  const visibleSubsForNav = classManager
    ? allSubsForNav
    : allSubsForNav.filter((s) => isSubmissionAuthor(s, effectiveUserId));
  const navIndex = visibleSubsForNav.findIndex((s) => s._id.toString() === submissionId);
  const prevNavSub = navIndex > 0 ? visibleSubsForNav[navIndex - 1] : null;
  const nextNavSub = navIndex < visibleSubsForNav.length - 1 ? visibleSubsForNav[navIndex + 1] : null;

  const ytLines = (sub.youtubeVideoIds ?? []).map(
    (id) => `https://www.youtube.com/watch?v=${id}`
  );
  const projectText = (sub.projectUrls ?? []).join("\n");

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
        href={`/classes/${classId}`}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 text-muted-foreground")}
      >
        ← {cls.title}
      </Link>

      {visibleSubsForNav.length > 1 && (
        <ProjectNav
          prev={prevNavSub ? { href: `/classes/${classId}/submissions/${prevNavSub._id}`, title: prevNavSub.title } : null}
          next={nextNavSub ? { href: `/classes/${classId}/submissions/${nextNavSub._id}`, title: nextNavSub.title } : null}
          current={navIndex + 1}
          total={visibleSubsForNav.length}
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
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={vis === "PUBLIC" ? "secondary" : "outline"} className="text-[10px]">
              {vis === "PUBLIC" ? "Public" : "Class only"}
            </Badge>
            {vis === "PUBLIC" && (
              <span className="text-xs text-muted-foreground">
                Comments: {commentsOk ? "on" : "off"}
              </span>
            )}
          </div>
        </div>
        {canDeleteSubmission && (
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
          {/* Abstract */}
          {sub.description && (
            <section>
              <h2 className="text-sm font-semibold text-foreground">Abstract</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {sub.description}
              </p>
            </section>
          )}

          {/* Videos */}
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

          {isAuthor && !classManager && !canEditContent && (
            <p className="mt-10 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              Editing is turned off for your account in this class. Contact your instructor if you
              need changes.
            </p>
          )}

          {canEditContent && (
            <>
              <Separator className="mt-10" />
              <section className="mt-8">
                <h2 className="text-base font-semibold">Edit submission</h2>
                {!canChangeVisUI && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Public/private and comment settings are locked for your account; other fields
                    can be updated below.
                  </p>
                )}
                <SubmissionForm
                  mode="edit"
                  classId={classId}
                  submissionId={submissionId}
                  showVisibility={canChangeVisUI}
                  initial={{
                    title: sub.title,
                    groupName: sub.groupName,
                    description: sub.description,
                    projectUrls: projectText,
                    youtubeUrls: ytLines.join("\n"),
                    coauthorSfuIds: (sub.authorSfuIds ?? [])
                      .filter((id) => id !== session.user.sfuId)
                      .join("\n"),
                    visibility: sub.visibility ?? cls.defaultVisibility,
                    commentsEnabled: sub.commentsEnabled ?? cls.commentsOnPublic,
                  }}
                />
              </section>
            </>
          )}
        </div>

        {/* ── Right column: feedback (sticky + scrollable) ── */}
        <aside className="lg:sticky lg:top-[4.5rem] lg:self-start">
          <div className="lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto lg:rounded-xl lg:border lg:border-border lg:bg-card lg:px-5 lg:py-5">
            <CommentsBlock
              submissionId={submissionId}
              comments={commentRows}
              canComment={vis === "PRIVATE" || commentsOk}
              canRate={canView}
              hasOwnComment={hasOwnComment}
              signedInUserId={effectiveUserId}
              isInstructor={classManager}
              ratingAverage={rating.average}
              ratingCount={rating.count}
              userRating={rating.userRating}
            />
          </div>
        </aside>

      </div>
    </div>
  );
}
