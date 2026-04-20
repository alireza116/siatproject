import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { canAccessClassOrGlobalAdmin, isClassAppManager } from "@/lib/class-access";
import { canStudentViewSubmissionInClass } from "@/lib/submission-access";
import { getViewAsUserId } from "@/lib/view-as";
import { getClassById, toLeanClassFull } from "@/lib/firestore/classes";
import { listSubmissionsByClass, toLeanSubmissionFull } from "@/lib/firestore/submissions";
import { effectiveVisibility } from "@/lib/visibility";
import type { LeanSubmissionFull } from "@/lib/types/lean";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getRatingStatsBySubmissionIds } from "@/lib/feedback";

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
  const submissions = classManager
    ? allSubmissions
    : allSubmissions.filter((s) => canStudentViewSubmissionInClass(s, cls, effectiveUserId));
  const ratings = await getRatingStatsBySubmissionIds(
    submissions.map((s) => s._id)
  );

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
        {classManager
          ? "All submissions for this class. Open one to watch demos, follow project links, and leave feedback."
          : "Public submissions from everyone in the class, plus your own work (including class-only). Open a card to view details and comments."}
      </p>

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
            return (
              <li key={s._id}>
                <Link
                  href={`/classes/${classId}/submissions/${s._id}`}
                  className="group flex flex-col gap-4 overflow-hidden rounded-xl border border-border bg-card p-3 shadow-sm transition hover:border-foreground/20 hover:shadow sm:flex-row sm:items-stretch sm:p-4"
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
                      <Badge
                        variant={vis === "PUBLIC" ? "secondary" : "outline"}
                        className="text-[10px]"
                      >
                        {vis === "PUBLIC" ? "Public" : "Class only"}
                      </Badge>
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
