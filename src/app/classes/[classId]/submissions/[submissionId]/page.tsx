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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getViewAsUserId } from "@/lib/view-as";

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
      <Link
        href={`/classes/${classId}`}
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

      {isAuthor && !classManager && !canEditContent && (
        <p className="mt-10 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Editing is turned off for your account in this class. Contact your instructor if you need
          changes.
        </p>
      )}

      {canEditContent && (
        <>
          <Separator className="mt-10" />
          <section className="mt-8">
            <h2 className="text-base font-semibold">Edit submission</h2>
            {!canChangeVisUI && (
              <p className="mt-2 text-sm text-muted-foreground">
                Public/private and comment settings are locked for your account; other fields can be
                updated below.
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
                visibility: sub.visibility ?? cls.defaultVisibility,
                commentsEnabled: sub.commentsEnabled ?? cls.commentsOnPublic,
              }}
            />
          </section>
        </>
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
        canComment={vis === "PRIVATE" || commentsOk}
        signedInUserId={effectiveUserId}
        isInstructor={classManager}
      />
    </div>
  );
}
