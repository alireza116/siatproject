import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { canAccessClassOrGlobalAdmin, isClassAppManager } from "@/lib/class-access";
import { getClassById, toLeanClassFull } from "@/lib/firestore/classes";
import { listSubmissionsByClass, toLeanSubmissionFull } from "@/lib/firestore/submissions";
import { ClassSettingsForm } from "./class-settings-form";
import { StudentPrivilegesSection } from "./student-privileges-section";
import { BulkSubmissionsVisibilityControls } from "@/components/BulkSubmissionsVisibilityControls";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getViewAsUserId } from "@/lib/view-as";
import { isSubmissionAuthor } from "@/lib/submission-access";
import { getRatingStatsBySubmissionIds } from "@/lib/feedback";
import type { LeanSubmissionFull } from "@/lib/types/lean";

export default async function ClassPage({
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
          Back to dashboard
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
  const subsRaw = await listSubmissionsByClass(classId);
  const allSubmissions: LeanSubmissionFull[] = subsRaw.map(toLeanSubmissionFull);
  const submissions = classManager
    ? allSubmissions
    : allSubmissions.filter((s) => isSubmissionAuthor(s, effectiveUserId));
  const ratings = await getRatingStatsBySubmissionIds(
    submissions.map((s) => s._id)
  );

  const submissionsListBody =
    submissions.length === 0 ? (
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">No submissions yet.</p>
        <Link
          href={`/classes/${classId}/submissions/new`}
          className={cn(buttonVariants({ size: "sm" }), "mt-3")}
        >
          Create the first submission
        </Link>
      </div>
    ) : (
      <ul className="divide-y divide-border">
        {submissions.map((s) => (
          <li key={s._id}>
            <Link
              href={`/classes/${classId}/submissions/${s._id}`}
              className="flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-muted/50"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground">{s.title}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {s.groupName}
                  {s.authorSfuIds?.length > 0 && ` · ${s.authorSfuIds.join(", ")}`}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {(() => {
                    const r = ratings.get(s._id);
                    if (!r || r.count === 0) return "Rating: not rated yet";
                    return `Rating: ${r.average.toFixed(1)} / 5 (${r.count})`;
                  })()}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0 text-xs">
                View →
              </Badge>
            </Link>
          </li>
        ))}
      </ul>
    );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link
        href="/dashboard"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 mb-2 text-muted-foreground")}
      >
        ← Dashboard
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{cls.title}</h1>
          {cls.description && (
            <p className="mt-1 text-sm text-muted-foreground">{cls.description}</p>
          )}
          {classManager && (
            <p className="mt-2 text-xs text-muted-foreground">
              Join code:{" "}
              <code className="rounded bg-muted px-1 font-mono font-medium text-foreground">
                {cls.joinCode}
              </code>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/classes/${classId}/projects`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            View projects
          </Link>
          <Link
            href={`/classes/${classId}/submissions/new`}
            className={buttonVariants({ size: "sm" })}
          >
            New submission
          </Link>
        </div>
      </div>

      {classManager && (
        <>
          <Separator className="my-8" />
          <ClassSettingsForm
            classId={classId}
            defaultVisibility={cls.defaultVisibility}
            commentsOnPublic={cls.commentsOnPublic}
            publicShowGroupName={cls.publicShowGroupName !== false}
            publicShowAuthorNames={cls.publicShowAuthorNames !== false}
            publicShowAuthorSfuIds={cls.publicShowAuthorSfuIds !== false}
          />
          <Separator className="my-8" />
          <BulkSubmissionsVisibilityControls classId={classId} />
          <Separator className="my-8" />
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-base font-semibold">Export data</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Download submissions and comments for this class as CSV.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={`/api/admin/export/submissions?classId=${classId}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Submissions CSV
              </a>
              <a
                href={`/api/admin/export/comments?classId=${classId}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Comments CSV
              </a>
            </div>
          </section>
          <Separator className="my-8" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
            <div className="flex min-h-0 flex-col">
              <div className="max-h-[min(70vh,36rem)] min-h-0 overflow-y-auto overscroll-contain pr-1">
                <StudentPrivilegesSection classId={classId} />
              </div>
            </div>
            <div className="flex min-h-0 flex-col">
              <h2 className="text-base font-semibold">All submissions</h2>
              <div className="mt-3 max-h-[min(70vh,36rem)] min-h-0 overflow-y-auto overscroll-contain rounded-xl border border-border bg-card">
                {submissionsListBody}
              </div>
            </div>
          </div>
        </>
      )}

      {!classManager && (
        <div className="mt-10">
          <h2 className="text-base font-semibold">Your submissions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Only submissions you&apos;re on as an author. Browse everyone&apos;s public projects from{" "}
            <Link href={`/classes/${classId}/projects`} className="underline underline-offset-4 hover:text-foreground">
              Class projects
            </Link>
            .
          </p>
          <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
            {submissionsListBody}
          </div>
        </div>
      )}
    </div>
  );
}
