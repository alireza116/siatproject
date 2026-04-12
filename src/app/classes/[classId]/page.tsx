import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db/connect";
import { canAccessClass, isClassInstructor } from "@/lib/class-access";
import { ClassModel } from "@/lib/models/Class";
import { Submission } from "@/lib/models/Submission";
import { leanOne } from "@/lib/mongoose-lean";
import type { LeanClassFull, LeanSubmissionFull } from "@/lib/types/lean";
import { ClassSettingsForm } from "./class-settings-form";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getViewAsUserId } from "@/lib/view-as";

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

  await dbConnect();
  const cls = leanOne<LeanClassFull>(await ClassModel.findById(classId).lean());
  if (!cls) {
    notFound();
  }

  const allowed = await canAccessClass(effectiveUserId, classId);
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

  // In preview mode, show the student perspective (no instructor settings)
  const instructor = !viewAsUserId && await isClassInstructor(session.user.id, classId);
  const submissions = (await Submission.find({ classId: cls._id })
    .sort({ createdAt: -1 })
    .lean()) as unknown as LeanSubmissionFull[];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
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
          {instructor && (
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

      {instructor && (
        <>
          <Separator className="my-8" />
          <ClassSettingsForm
            classId={classId}
            defaultVisibility={cls.defaultVisibility}
            commentsOnPublic={cls.commentsOnPublic}
          />
        </>
      )}

      <div className="mt-10">
        <h2 className="text-base font-semibold">Submissions</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
          {submissions.length === 0 ? (
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
                <li key={s._id.toString()}>
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
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      View →
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
