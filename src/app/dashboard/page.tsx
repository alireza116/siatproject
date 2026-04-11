import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db/connect";
import { Enrollment } from "@/lib/models/Enrollment";
import { ClassModel } from "@/lib/models/Class";
import { JoinForm } from "@/app/dashboard/join-form";
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

  const isAdmin = session.user.role === "GLOBAL_ADMIN";

  await dbConnect();
  const enrollments = (await Enrollment.find({ userId: session.user.id })
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
    if (isTeachingEnrollment(e, c, session.user.id)) {
      teaching.push({ e, c });
    }
    if (isStudentEnrollment(e, c, session.user.id)) {
      learning.push({ e, c });
    }
  }

  const showTeaching = isAdmin || teaching.length > 0;
  const showStudent = learning.length > 0 || (!showTeaching);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        {isAdmin && (
          <Link
            href="/admin"
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50"
          >
            Admin
          </Link>
        )}
      </div>

      {showTeaching && (
        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-zinc-900">Teaching</h2>
            {isAdmin && (
              <Link
                href="/classes/new"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                New class
              </Link>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            Classes you own or lead. Open a class to see settings, or go straight to{" "}
            <strong>class projects</strong> to review submissions and comments.
          </p>
          <div className="mt-4 rounded-lg border border-zinc-200 bg-white">
            {teaching.length === 0 ? (
              <p className="p-6 text-sm text-zinc-600">
                You are not teaching any class yet. Create one to get a join code for students.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {teaching.map(({ e, c }) => (
                  <li key={e._id.toString()} className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
                    <Link href={`/classes/${c._id}`} className="min-w-0 flex-1 hover:text-red-800">
                      <p className="font-medium">{c.title}</p>
                      <p className="text-xs text-zinc-500">
                        Role: {e.role} · Code: <span className="font-mono">{c.joinCode}</span>
                      </p>
                    </Link>
                    <Link
                      href={`/classes/${c._id}/projects`}
                      className="shrink-0 text-sm font-medium text-red-800 underline"
                    >
                      Class projects
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
          <h2 className="text-lg font-semibold text-zinc-900">Your classes (as student)</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Join with a code from your instructor, then open <strong>class projects</strong> to see
            everyone’s submissions and leave feedback.
          </p>
          <div className="mt-4 rounded-lg border border-zinc-200 bg-white">
            {learning.length === 0 ? (
              <p className="p-6 text-sm text-zinc-600">
                You have not joined any class as a student yet. Use the form below with your join
                code.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {learning.map(({ e, c }) => (
                  <li key={e._id.toString()} className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
                    <Link href={`/classes/${c._id}`} className="min-w-0 flex-1 hover:text-red-800">
                      <p className="font-medium">{c.title}</p>
                      <p className="text-xs text-zinc-500">
                        Join code: <span className="font-mono">{c.joinCode}</span>
                      </p>
                    </Link>
                    <Link
                      href={`/classes/${c._id}/projects`}
                      className="shrink-0 text-sm font-medium text-red-800 underline"
                    >
                      Class projects
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
