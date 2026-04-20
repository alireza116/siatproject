import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  getClassesByIds,
  listAllClasses,
  listClassesOwnedBy,
  toLeanClassFull,
} from "@/lib/firestore/classes";
import type { ClassRecord } from "@/lib/firestore/classes";
import { listEnrollmentsForUser } from "@/lib/firestore/enrollments";
import { JoinForm } from "@/app/dashboard/join-form";
import { LeaveClassButton } from "@/app/dashboard/leave-class-button";
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
  createdAt: number;
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

  // Fetch everything we need in parallel. For a global admin, we also pull
  // the full class list so every class is visible on their dashboard — this
  // is resilient to cases where the admin's current session identity differs
  // from the ownerId recorded on a class (e.g. CAS vs. Google sign-in
  // creates separate user documents for the same person).
  const [enrollmentsRaw, ownedRaw, allClassesRaw] = await Promise.all([
    listEnrollmentsForUser(effectiveUserId),
    listClassesOwnedBy(effectiveUserId),
    isAdmin ? listAllClasses() : Promise.resolve<ClassRecord[]>([]),
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

  // Union of all classes we need: owned + enrolled + (for admins) everything.
  const classRecordById = new Map<string, ClassRecord>();
  for (const c of ownedRaw) classRecordById.set(c.id, c);
  for (const c of allClassesRaw) classRecordById.set(c.id, c);
  const missingClassIds = enrollments
    .map((e) => e.classId)
    .filter((id) => !classRecordById.has(id));
  if (missingClassIds.length > 0) {
    const extra = await getClassesByIds(missingClassIds);
    for (const c of extra) classRecordById.set(c.id, c);
  }
  const byId = new Map<string, LeanClassFull>();
  for (const [id, rec] of classRecordById) byId.set(id, toLeanClassFull(rec));

  // Build the teaching list with a well-defined label precedence:
  // OWNER (class.ownerId === me) > INSTRUCTOR / ASSISTANT enrollment > ADMIN
  // (admin-only visibility on a class I have no direct relationship with).
  const teachingByClassId = new Map<string, TeachingRow>();

  const addRow = (cls: LeanClassFull, roleLabel: string, key: string) => {
    const rec = classRecordById.get(cls._id);
    teachingByClassId.set(cls._id, {
      key,
      cls,
      roleLabel,
      createdAt: rec ? rec.createdAt.getTime() : 0,
    });
  };

  for (const e of enrollments) {
    const c = byId.get(e.classId);
    if (!c) continue;
    if (!isTeachingEnrollment(e, c, effectiveUserId)) continue;
    const roleLabel = c.ownerId === effectiveUserId ? "OWNER" : e.role;
    addRow(c, roleLabel, e._id);
  }

  for (const rec of ownedRaw) {
    const c = byId.get(rec.id);
    if (!c) continue;
    const existing = teachingByClassId.get(c._id);
    if (existing) {
      existing.roleLabel = "OWNER";
    } else {
      addRow(c, "OWNER", `owner:${c._id}`);
    }
  }

  if (isAdmin) {
    for (const rec of allClassesRaw) {
      const c = byId.get(rec.id);
      if (!c) continue;
      if (teachingByClassId.has(c._id)) continue;
      addRow(c, "ADMIN", `admin:${c._id}`);
    }
  }

  const teaching = [...teachingByClassId.values()].sort(
    (a, b) => b.createdAt - a.createdAt,
  );

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
