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

  await dbConnect();
  const cls = leanOne<LeanClassFull>(await ClassModel.findById(classId).lean());
  if (!cls) {
    notFound();
  }

  const allowed = await canAccessClass(session.user.id, classId);
  if (!allowed) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <p className="text-zinc-600">You are not enrolled in this class.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm text-red-800 underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const instructor = await isClassInstructor(session.user.id, classId);
  const submissions = (await Submission.find({ classId: cls._id })
    .sort({ createdAt: -1 })
    .lean()) as unknown as LeanSubmissionFull[];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/dashboard" className="text-sm text-zinc-600 hover:text-zinc-900">
        ← Dashboard
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{cls.title}</h1>
          {cls.description && <p className="mt-2 text-sm text-zinc-600">{cls.description}</p>}
          {!instructor && (
            <p className="mt-2 text-xs text-zinc-500">
              Submission options and visibility for this class are set by your instructor.
            </p>
          )}
          {instructor && (
            <p className="mt-2 text-xs text-zinc-500">
              Join code: <span className="font-mono font-medium">{cls.joinCode}</span>
            </p>
          )}
          <p className="mt-3">
            <Link
              href={`/classes/${classId}/projects`}
              className="text-sm font-medium text-red-800 underline"
            >
              Class projects — browse submissions & comments
            </Link>
          </p>
        </div>
        <Link
          href={`/classes/${classId}/submissions/new`}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          New submission
        </Link>
      </div>

      {instructor && (
        <ClassSettingsForm
          classId={classId}
          defaultVisibility={cls.defaultVisibility}
          commentsOnPublic={cls.commentsOnPublic}
          allowGroupSubmissions={cls.allowGroupSubmissions}
        />
      )}

      <h2 className="mt-10 text-lg font-medium">Submissions</h2>
      <ul className="mt-4 divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
        {submissions.length === 0 ? (
          <li className="p-6 text-sm text-zinc-600">No submissions yet.</li>
        ) : (
          submissions.map((s) => (
            <li key={s._id.toString()}>
              <Link
                href={`/classes/${classId}/submissions/${s._id}`}
                className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-zinc-50"
              >
                <div>
                  <p className="font-medium">{s.title}</p>
                  <p className="text-xs text-zinc-500">
                    {s.groupName} · {s.authorSfuIds.join(", ")}
                  </p>
                </div>
                <span className="text-sm text-zinc-500">View →</span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
