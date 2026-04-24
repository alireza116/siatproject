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
import { cn } from "@/lib/utils";
import { getRatingStatsBySubmissionIds } from "@/lib/feedback";
import { getGroupReviewsForSubmissions } from "@/lib/group-reviews";
import { listUsersByIds } from "@/lib/firestore/users";
import { appDisplayLabelFromRecord } from "@/lib/display-name";
import { ClassProjectsFilterableList } from "@/components/ClassProjectsFilterableList";

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
      for (const uid of s.authorUserIds ?? []) {
        groupUserIds.add(uid);
      }
    }
    groupUserIds.delete(effectiveUserId);
    if (groupUserIds.size > 0) {
      const groupUsers = await listUsersByIds([...groupUserIds]);
      for (const u of groupUsers) {
        groupLabelById.set(u.id, appDisplayLabelFromRecord(u));
      }
      for (const uid of groupUserIds) {
        if (!groupLabelById.has(uid)) groupLabelById.set(uid, "member");
      }
    }
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
        <div className="mt-8">
          <ClassProjectsFilterableList
            classId={classId}
            showGroupHints={showGroupHints}
            rows={submissions.map((s) => {
              const vis = effectiveVisibility(s, cls);
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

              return {
                id: s._id,
                title: s.title,
                groupName: s.groupName,
                description: s.description,
                authorNames: s.authorNames ?? [],
                authorSfuIds: s.authorSfuIds ?? [],
                youtubeThumbId: s.youtubeVideoIds?.[0],
                visibility: vis,
                ratingText,
                createdAtIso: s.createdAt.toISOString(),
                isOwnGroup,
                reviewed,
                needsReview,
                reviewerLabels,
              };
            })}
          />
        </div>
      )}
    </div>
  );
}
