import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getClassesByIds, listClassesOwnedBy } from "@/lib/firestore/classes";
import { listEnrollmentsForUser } from "@/lib/firestore/enrollments";
import { JoinForm } from "@/app/dashboard/join-form";
import { LeaveClassButton } from "@/app/dashboard/leave-class-button";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getViewAsUserId } from "@/lib/view-as";
import type { LeanClassFull, LeanEnrollment } from "@/lib/types/lean";
import { toLeanClassFull } from "@/lib/firestore/classes";

function isTeachingEnrollment(
  e: LeanEnrollment,
  cls: LeanClassFull,
  userId: string
): boolean {
  if (cls.ownerId === userId) return true;
  return e.role === "INSTRUCTOR" || e.role === "ASSISTANT";
}

function isStudentEnrollment(e: LeanEnrollment, cls: LeanClassFull, userId: string): boolean {
  if (cls.ownerId === userId) return false;
  return e.role === "STUDENT";
}

type TeachingRow = {
  key: string;
  cls: LeanClassFull;
  roleLabel: string;
};

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
  const isAdmin = !viewAsUserId && session.user.role === "GLOBAL_ADMIN";

  // Fetch enrollments + owned classes in parallel. Owned classes are the
  // source of truth for "classes I created" — they show up on my dashboard
  // even if the instructor enrollment is missing for any reason.
  const [enrollmentsRaw, ownedRaw] = await Promise.all([
    listEnrollmentsForUser(effectiveUserId),
    listClassesOwnedBy(effectiveUserId),
  ]);

  const enrollments: LeanEnrollment[] = enrollmentsRaw.map((e) => ({
    _id: e.id,
    classId: e.classId,
    userId: e.userId,
    role: e.role,
    createdAt: e.createdAt,
    studentCanEditSubmissions: e.studentCanEditSubmissions,
    studentCanDeleteSubmissions: e.studentCanDeleteSubmissions,
    studentCanChangeVisibility: e.studentCanChangeVisibility,
  }));
  const ownedClasses = ownedRaw.map(toLeanClassFull);

  // Classes we need to look up — union of enrolled classes and owned classes.
  const ownedById = new Map(ownedClasses.map((c) => [c._id, c]));
  const missingClassIds = enrollments
    .map((e) => e.classId)
    .filter((id) => !ownedById.has(id));
  const extraClassesRaw = await getClassesByIds(missingClassIds);
  const extraClasses = extraClassesRaw.map(toLeanClassFull);
  const byId = new Map<string, LeanClassFull>();
  for (const c of ownedClasses) byId.set(c._id, c);
  for (const c of extraClasses) byId.set(c._id, c);

  // Build the teaching list from enrollments first (preserves their ordering
  // — newest enrollment first), then fill in any owned classes that don't
  // have an enrollment row at all.
  const teachingByClassId = new Map<string, TeachingRow>();
  for (const e of enrollments) {
    const c = byId.get(e.classId);
    if (!c) continue;
    if (!isTeachingEnrollment(e, c, effectiveUserId)) continue;
    teachingByClassId.set(c._id, {
      key: e._id,
      cls: c,
      roleLabel: c.ownerId === effectiveUserId ? "OWNER" : e.role,
    });
  }
  for (const c of ownedClasses) {
    if (teachingByClassId.has(c._id)) {
      // Make sure owned classes always show the OWNER label even if the
      // enrollment was stored as INSTRUCTOR.
      const cur = teachingByClassId.get(c._id)!;
      cur.roleLabel = "OWNER";
      continue;
    }
    teachingByClassId.set(c._id, {
      key: `owner:${c._id}`,
      cls: c,
      roleLabel: "OWNER",
    });
  }
  const teaching = [...teachingByClassId.values()];

  // Students = enrollments where I'm not the owner and role === STUDENT.
  const learning: { e: LeanEnrollment; c: LeanClassFull }[] = [];
  for (const e of enrollments) {
    const c = byId.get(e.classId);
    if (!c) continue;
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
                {teaching.map(({ key, cls, roleLabel }) => (
                  <li key={key} className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
                    <Link href={`/classes/${cls._id}`} className="min-w-0 flex-1 hover:text-foreground">
                      <p className="font-medium text-foreground">{cls.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        <span className="font-mono">{cls.joinCode}</span>
                        {" · "}
                        <Badge variant="secondary" className="text-[10px] py-0">{roleLabel}</Badge>
                      </p>
                    </Link>
                    <Link
                      href={`/classes/${cls._id}/projects`}
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
                  <li key={e._id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
                    <Link href={`/classes/${c._id}`} className="min-w-0 flex-1 hover:text-foreground">
                      <p className="font-medium text-foreground">{c.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground font-mono">{c.joinCode}</p>
                    </Link>
                    <div className="flex shrink-0 items-center gap-3">
                      <Link
                        href={`/classes/${c._id}/projects`}
                        className="text-sm font-medium text-foreground underline underline-offset-4"
                      >
                        View projects
                      </Link>
                      <LeaveClassButton classId={c._id} />
                    </div>
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
