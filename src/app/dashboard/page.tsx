import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db/connect";
import { Enrollment } from "@/lib/models/Enrollment";
import { ClassModel } from "@/lib/models/Class";
import { JoinForm } from "@/app/dashboard/join-form";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getViewAsUserId } from "@/lib/view-as";
import type { LeanClassFull, LeanEnrollment } from "@/lib/types/lean";

function isTeachingEnrollment(
  e: LeanEnrollment,
  cls: LeanClassFull,
  userId: string
): boolean {
  if (cls.ownerId.toString() === userId) return true;
  return e.role === "INSTRUCTOR" || e.role === "ASSISTANT";
}

function isStudentEnrollment(e: LeanEnrollment, cls: LeanClassFull, userId: string): boolean {
  if (cls.ownerId.toString() === userId) return false;
  return e.role === "STUDENT";
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }
  if (!session.user.sfuId) {
    redirect("/onboarding/sfu-id");
  }

  const viewAsUserId = await getViewAsUserId(session.user.role);
  const effectiveUserId = viewAsUserId ?? session.user.id;
  // When previewing as a student, suppress admin privileges so we see the student experience
  const isAdmin = !viewAsUserId && session.user.role === "GLOBAL_ADMIN";

  await dbConnect();
  const enrollments = (await Enrollment.find({ userId: effectiveUserId })
    .sort({ createdAt: -1 })
    .lean()) as unknown as LeanEnrollment[];

  const classIds = enrollments.map((e) => e.classId);
  const classes = (await ClassModel.find({ _id: { $in: classIds } }).lean()) as unknown as LeanClassFull[];
  const byId = new Map(classes.map((c) => [c._id.toString(), c]));

  const teaching: { e: LeanEnrollment; c: LeanClassFull }[] = [];
  const learning: { e: LeanEnrollment; c: LeanClassFull }[] = [];
  for (const e of enrollments) {
    const c = byId.get(e.classId.toString());
    if (!c) continue;
    if (isTeachingEnrollment(e, c, effectiveUserId)) {
      teaching.push({ e, c });
    }
    if (isStudentEnrollment(e, c, effectiveUserId)) {
      learning.push({ e, c });
    }
  }

  const showTeaching = isAdmin || teaching.length > 0;
  const showStudent = learning.length > 0 || !showTeaching;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {viewAsUserId ? `Previewing as student` : `Welcome back, ${session.user.sfuId}`}
          </p>
        </div>
        {isAdmin && (
          <Link href="/admin" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Admin settings
          </Link>
        )}
      </div>

      {showTeaching && (
        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-foreground">Teaching</h2>
            {isAdmin && (
              <Link href="/classes/new" className={buttonVariants({ size: "sm" })}>
                New class
              </Link>
            )}
          </div>
          <div className={cn("mt-3 overflow-hidden rounded-xl border border-border bg-card", teaching.length === 0 && "")}>
            {teaching.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                No classes yet.{" "}
                {isAdmin && (
                  <Link href="/classes/new" className="font-medium text-foreground underline underline-offset-4">
                    Create the first one
                  </Link>
                )}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {teaching.map(({ e, c }) => (
                  <li key={e._id.toString()} className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
                    <Link href={`/classes/${c._id}`} className="min-w-0 flex-1 hover:text-foreground">
                      <p className="font-medium text-foreground">{c.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        <span className="font-mono">{c.joinCode}</span>
                        {" · "}
                        <Badge variant="secondary" className="text-[10px] py-0">{e.role}</Badge>
                      </p>
                    </Link>
                    <Link
                      href={`/classes/${c._id}/projects`}
                      className="shrink-0 text-sm font-medium text-foreground underline underline-offset-4"
                    >
                      View projects
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {showStudent && (
        <section className={showTeaching ? "mt-12" : "mt-10"}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Enrolled classes</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Classes you&apos;ve joined as a student.
              </p>
            </div>
            <Link href="/my-submissions" className={buttonVariants({ variant: "outline", size: "sm" })}>
              My submissions
            </Link>
          </div>
          <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
            {learning.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                You haven&apos;t joined any class yet. Use the form below with a join code from your instructor.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {learning.map(({ e, c }) => (
                  <li key={e._id.toString()} className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
                    <Link href={`/classes/${c._id}`} className="min-w-0 flex-1 hover:text-foreground">
                      <p className="font-medium text-foreground">{c.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground font-mono">{c.joinCode}</p>
                    </Link>
                    <Link
                      href={`/classes/${c._id}/projects`}
                      className="shrink-0 text-sm font-medium text-foreground underline underline-offset-4"
                    >
                      View projects
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <JoinForm />
        </section>
      )}
    </div>
  );
}
