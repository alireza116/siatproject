import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { canAccessClassOrGlobalAdmin, isClassAppManager } from "@/lib/class-access";
import { getViewAsUserId } from "@/lib/view-as";
import { getClassById, toLeanClassFull } from "@/lib/firestore/classes";
import { listSubmissionsByClass, toLeanSubmissionFull } from "@/lib/firestore/submissions";
import { effectiveVisibility } from "@/lib/visibility";
import type { LeanSubmissionFull } from "@/lib/types/lean";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getRatingStatsBySubmissionIds } from "@/lib/feedback";
import { getGroupReviewsForSubmissions } from "@/lib/group-reviews";

export default async function ClassProjectsPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }
  if (!session.user.sfuId) {
    redirect("/onboarding/sfu-id");
  }

  const viewAsUserId = await getViewAsUserId(session.user.role);
  const effectiveUserId = viewAsUserId ?? session.user.id;

  const clsRaw = await getClassById(classId);
  if (!clsRaw) {
    notFound();
  }
  const cls = toLeanClassFull(clsRaw);

  const allowed = await canAccessClassOrGlobalAdmin(effectiveUserId, classId, {
    isGlobalAdmin: !viewAsUserId && session.user.role === "GLOBAL_ADMIN",
  });
  if (!allowed) {
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

  const subsRaw = await listSubmissionsByClass(classId);
  const allSubmissions: LeanSubmissionFull[] = subsRaw.map(toLeanSubmissionFull);

  const classManager =
    !viewAsUserId &&
    (await isClassAppManager(session.user.id, classId, {
      globalRole: session.user.role,
      viewAsActive: false,
    }));
  // Everyone enrolled (student or manager) sees every submission in the class.
  const submissions = allSubmissions;
  const ratings = await getRatingStatsBySubmissionIds(
    submissions.map((s) => s._id)
  );

  // Figure out the current user's group for this class: the union of
  // authorUserIds across any submission they're on. We also build a lookup
  // from userId to a friendly label (sfuId when known) so we can show names.
  const mySubmissionIds = new Set<string>();
  const groupUserIds = new Set<string>();
  const groupLabelById = new Map<string, string>();
  if (!classManager) {
    for (const s of submissions) {
      if (!s.authorUserIds?.includes(effectiveUserId)) continue;
      mySubmissionIds.add(s._id);
      for (let i = 0; i < s.authorUserIds.length; i++) {
        const uid = s.authorUserIds[i]!;
        groupUserIds.add(uid);
        const sfu = s.authorSfuIds?.[i];
        const name = s.authorNames?.[i];
        if (!groupLabelById.has(uid)) {
          groupLabelById.set(uid, sfu || name || "member");
        }
      }
    }
    // Don't count the viewer themselves in the reviewer display.
    groupUserIds.delete(effectiveUserId);
  }

  const groupMemberCount = groupUserIds.size;
  const reviewableSubmissionIds = submissions
    .map((s) => s._id)
    .filter((id) => !mySubmissionIds.has(id));

  const reviewsByGroup =
    !classManager && groupUserIds.size > 0
      ? await getGroupReviewsForSubmissions(
          reviewableSubmissionIds,
          [...groupUserIds],
        )
      : new Map<string, Set<string>>();

  // Summary numbers for the header hint.
  let reviewedCount = 0;
  for (const sid of reviewableSubmissionIds) {
    if ((reviewsByGroup.get(sid)?.size ?? 0) > 0) reviewedCount += 1;
  }
  const needsReviewCount = reviewableSubmissionIds.length - reviewedCount;
  const showGroupHints = !classManager && groupMemberCount > 0 && reviewableSubmissionIds.length > 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link
        href={`/classes/${classId}`}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 mb-2 text-muted-foreground")}
      >
        ← {cls.title}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Class projects</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        All submissions from everyone in this class. Open a card to watch demos,
        follow project links, and leave feedback. The Public / Class only label
        only controls whether a project shows up in the outside gallery.
      </p>

      {showGroupHints && (
        <div className="mt-6 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Your group&apos;s reviews</span>
          <span aria-hidden>·</span>
          <span>
            <span className="font-medium text-foreground">{reviewedCount}</span> of{" "}
            <span className="font-medium text-foreground">{reviewableSubmissionIds.length}</span>{" "}
            projects covered
          </span>
          {needsReviewCount > 0 && (
            <>
              <span aria-hidden>·</span>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-medium text-amber-700 dark:text-amber-400">
                {needsReviewCount} still {needsReviewCount === 1 ? "needs" : "need"} a reviewer
              </span>
            </>
          )}
          <span className="ml-auto text-muted-foreground">
            Counts ratings and comments by {groupMemberCount === 1 ? "your group member" : "your group members"}.
          </span>
        </div>
      )}

      {submissions.length === 0 ? (
        <div className="mt-10 rounded-xl border border-border bg-card px-8 py-12 text-center">
          <p className="text-sm text-muted-foreground">No submissions yet.</p>
          <Link
            href={`/classes/${classId}/submissions/new`}
            className={cn(buttonVariants({ size: "sm" }), "mt-3")}
          >
            Create the first submission
          </Link>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {submissions.map((s) => {
            const vis = effectiveVisibility(s, cls);
            const thumb = s.youtubeVideoIds?.[0];
            const r = ratings.get(s._id);
            const ratingText =
              !r || r.count === 0
                ? "Not rated yet"
                : `${r.average.toFixed(1)} / 5 · ${r.count} ${r.count === 1 ? "rating" : "ratings"}`;

            const isOwnGroup = mySubmissionIds.has(s._id);
            const reviewerIds = showGroupHints && !isOwnGroup ? reviewsByGroup.get(s._id) : undefined;
            const reviewerLabels = reviewerIds
              ? [...reviewerIds]
                  .map((uid) => groupLabelById.get(uid) ?? "member")
                  .sort((a, b) => a.localeCompare(b))
              : [];
            const reviewed = reviewerLabels.length > 0;
            const needsReview = showGroupHints && !isOwnGroup && !reviewed;

            return (
              <li key={s._id}>
                <Link
                  href={`/classes/${classId}/submissions/${s._id}`}
                  className={cn(
                    "group flex flex-col gap-4 overflow-hidden rounded-xl border bg-card p-3 shadow-sm transition hover:border-foreground/20 hover:shadow sm:flex-row sm:items-stretch sm:p-4",
                    isOwnGroup
                      ? "border-border"
                      : reviewed
                      ? "border-emerald-500/30"
                      : needsReview
                      ? "border-amber-500/40"
                      : "border-border",
                  )}
                >
                  <div className="relative w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:w-56 md:w-64">
                    <div className="relative aspect-video">
                      {thumb ? (
                        <Image
                          src={`https://img.youtube.com/vi/${thumb}/mqdefault.jpg`}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 768px) 224px, 256px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                          No video
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-2 sm:py-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-medium text-foreground">{s.title}</p>
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        {isOwnGroup && showGroupHints && (
                          <Badge
                            variant="outline"
                            className="border-foreground/20 text-[10px] text-foreground"
                          >
                            Your group
                          </Badge>
                        )}
                        {!isOwnGroup && reviewed && (
                          <Badge
                            variant="outline"
                            className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-400"
                          >
                            Reviewed by your group
                          </Badge>
                        )}
                        {needsReview && (
                          <Badge
                            variant="outline"
                            className="border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400"
                          >
                            Needs review
                          </Badge>
                        )}
                        <Badge
                          variant={vis === "PUBLIC" ? "secondary" : "outline"}
                          className="text-[10px]"
                        >
                          {vis === "PUBLIC" ? "Public" : "Class only"}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {s.groupName}
                      {s.authorSfuIds?.length > 0 && ` · ${s.authorSfuIds.join(", ")}`}
                    </p>
                    {s.description && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {s.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">Rating: {ratingText}</p>
                    {!isOwnGroup && reviewed && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">
                        Reviewed by: {reviewerLabels.join(", ")}
                      </p>
                    )}
                    <p className="mt-auto text-xs text-muted-foreground">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
