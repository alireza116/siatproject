import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { canAccessClassOrGlobalAdmin, isClassAppManager } from "@/lib/class-access";
import { canStudentViewSubmissionInClass } from "@/lib/submission-access";
import { getViewAsUserId } from "@/lib/view-as";
import { dbConnect } from "@/lib/db/connect";
import { ClassModel } from "@/lib/models/Class";
import { Submission } from "@/lib/models/Submission";
import { leanOne } from "@/lib/mongoose-lean";
import { effectiveVisibility } from "@/lib/visibility";
import type { LeanClassFull, LeanSubmissionFull } from "@/lib/types/lean";
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

  await dbConnect();
  const cls = leanOne<LeanClassFull>(await ClassModel.findById(classId).lean());
  if (!cls) {
    notFound();
  }

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

  const allSubmissions = (await Submission.find({ classId: cls._id })
    .sort({ createdAt: -1 })
    .lean()) as unknown as LeanSubmissionFull[];

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
    submissions.map((s) => s._id.toString())
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
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {submissions.map((s) => {
            const vis = effectiveVisibility(s, cls);
            const thumb = s.youtubeVideoIds?.[0];
            return (
              <li key={s._id.toString()}>
                <Link
                  href={`/classes/${classId}/submissions/${s._id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:border-foreground/20 hover:shadow"
                >
                  {thumb ? (
                    <div className="relative aspect-video bg-muted">
                      <Image
                        src={`https://img.youtube.com/vi/${thumb}/mqdefault.jpg`}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 50vw"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-video items-center justify-center bg-muted text-xs text-muted-foreground">
                      No video
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-4">
                    <p className="font-medium text-foreground">{s.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {s.groupName}
                      {s.authorSfuIds?.length > 0 && ` · ${s.authorSfuIds.join(", ")}`}
                    </p>
                    {s.description && (
                      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                        {s.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {(() => {
                        const r = ratings.get(s._id.toString());
                        if (!r || r.count === 0) return "Rating: not rated yet";
                        return `Rating: ${r.average.toFixed(1)} / 5 (${r.count})`;
                      })()}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <Badge variant={vis === "PUBLIC" ? "secondary" : "outline"} className="text-[10px]">
                        {vis === "PUBLIC" ? "Public" : "Class only"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </span>
                    </div>
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
