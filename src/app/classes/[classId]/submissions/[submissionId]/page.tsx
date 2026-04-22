import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isSubmissionAuthor } from "@/lib/submission-access";
import { auth } from "@/auth";
import { deleteSubmissionAction } from "@/app/actions/submission";
import {
  canAccessClassOrGlobalAdmin,
  getStudentSubmissionPrivileges,
  isClassAppManager,
} from "@/lib/class-access";
import type { LeanComment, LeanUserPublic } from "@/lib/types/lean";
import { getClassById, toLeanClassFull } from "@/lib/firestore/classes";
import { listCommentsForSubmission } from "@/lib/firestore/comments";
import {
  getSubmissionById,
  listSubmissionsByClass,
  toLeanSubmissionFull,
} from "@/lib/firestore/submissions";
import { listUsersByIds } from "@/lib/firestore/users";
import { effectiveCommentsOnPublic, effectiveVisibility } from "@/lib/visibility";
import { SubmissionViewOrEdit } from "@/components/SubmissionViewOrEdit";
import { CommentsBlock } from "@/components/CommentsBlock";
import { DeleteSubmissionButton } from "@/components/DeleteSubmissionButton";
import { ProjectNav } from "@/components/ProjectNav";
import { Badge } from "@/components/ui/badge";
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

  const subRaw = await getSubmissionById(submissionId);
  if (!subRaw || subRaw.classId !== classId) notFound();
  const sub = toLeanSubmissionFull(subRaw);

  const clsRaw = await getClassById(classId);
  if (!clsRaw) notFound();
  const cls = toLeanClassFull(clsRaw);

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
  // Everyone enrolled in the class (or a manager / global admin) can see and
  // rate any submission — enrollment has already been checked above. Public /
  // private only gates the external gallery view, not the in-class view.
  const isAuthor = !viewAsUserId && isSubmissionAuthor(sub, effectiveUserId);
  const studentPriv = await getStudentSubmissionPrivileges(effectiveUserId, classId);
  const canEditContent = classManager || (isAuthor && studentPriv.canEditSubmissions);
  const canChangeVisUI = classManager || (isAuthor && studentPriv.canChangeVisibility);
  const canDeleteSubmission =
    classManager || (isAuthor && studentPriv.canDeleteSubmissions);

  const commentsRaw = await listCommentsForSubmission(submissionId);
  const comments: LeanComment[] = commentsRaw.map((c) => ({
    _id: c.id,
    userId: c.userId,
    body: c.body,
    createdAt: c.createdAt,
  }));
  const hasOwnComment = comments.some((c) => c.userId === effectiveUserId);
  const commentIds = comments.map((c) => c._id);
  const voteSummary = await getCommentVoteSummary(commentIds, session.user.id);
  const userIds = [...new Set(comments.map((c) => c.userId))];
  const users = await listUsersByIds(userIds);
  const userMap = new Map(users.map((u) => [u.id, u]));

  const vis = effectiveVisibility(sub, cls);
  const commentsOk = effectiveCommentsOnPublic(sub, cls);
  const rating = await getRatingStatsForSubmission(submissionId, session.user.id);

  const allSubsRaw = await listSubmissionsByClass(classId);
  const allSubsForNav = allSubsRaw.map(toLeanSubmissionFull);
  const visibleSubsForNav = classManager
    ? allSubsForNav
    : allSubsForNav.filter((s) => isSubmissionAuthor(s, effectiveUserId));
  const navIndex = visibleSubsForNav.findIndex((s) => s._id === submissionId);
  const prevNavSub = navIndex > 0 ? visibleSubsForNav[navIndex - 1]! : null;
  const nextNavSub = navIndex < visibleSubsForNav.length - 1 ? visibleSubsForNav[navIndex + 1]! : null;

  const ytLines = (sub.youtubeVideoIds ?? []).map(
    (id) => `https://www.youtube.com/watch?v=${id}`
  );
  const projectText = (sub.projectUrls ?? []).join("\n");

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

      <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_380px]">

        <div className="min-w-0">
          <SubmissionViewOrEdit
            classId={classId}
            submissionId={submissionId}
            view={{
              description: sub.description,
              youtubeVideoIds: sub.youtubeVideoIds ?? [],
              projectUrls: sub.projectUrls ?? [],
            }}
            edit={{
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
            canEdit={canEditContent}
            canChangeVisibility={canChangeVisUI}
            showVisibilityLockedNote={canEditContent}
            showEditingDisabledNote={isAuthor && !classManager && !canEditContent}
          />
        </div>

        <aside className="lg:sticky lg:top-[4.5rem] lg:self-start">
          <div className="lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto lg:rounded-xl lg:border lg:border-border lg:bg-card lg:px-5 lg:py-5">
            <CommentsBlock
              submissionId={submissionId}
              comments={commentRows}
              canComment={vis === "PRIVATE" || commentsOk}
              canRate
              hasOwnComment={hasOwnComment}
              signedInUserId={session.user.id}
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
