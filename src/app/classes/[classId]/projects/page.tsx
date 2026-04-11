import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { canAccessClass } from "@/lib/class-access";
import { dbConnect } from "@/lib/db/connect";
import { ClassModel } from "@/lib/models/Class";
import { Submission } from "@/lib/models/Submission";
import { leanOne } from "@/lib/mongoose-lean";
import { effectiveVisibility } from "@/lib/visibility";
import type { LeanClassFull, LeanSubmissionFull } from "@/lib/types/lean";

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
        <Link href="/dashboard" className="mt-4 inline-block text-sm underline">
          Dashboard
        </Link>
      </div>
    );
  }

  const submissions = (await Submission.find({ classId: cls._id })
    .sort({ createdAt: -1 })
    .lean()) as unknown as LeanSubmissionFull[];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href={`/classes/${classId}`} className="text-sm text-zinc-600 hover:text-zinc-900">
        ← {cls.title}
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Class projects</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Every submission for this class is listed here. Open one to watch embedded demos, follow
        project links, and read or write feedback in the comments.
      </p>

      {submissions.length === 0 ? (
        <p className="mt-10 rounded-lg border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-600">
          No submissions yet.{" "}
          <Link href={`/classes/${classId}/submissions/new`} className="font-medium text-red-800 underline">
            Create the first submission
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {submissions.map((s) => {
            const vis = effectiveVisibility(s, cls);
            const thumb = s.youtubeVideoIds?.[0];
            return (
              <li key={s._id.toString()}>
                <Link
                  href={`/classes/${classId}/submissions/${s._id}`}
                  className="flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:border-zinc-300 hover:shadow"
                >
                  {thumb ? (
                    <div className="relative aspect-video bg-zinc-900">
                      <Image
                        src={`https://img.youtube.com/vi/${thumb}/mqdefault.jpg`}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 50vw"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-video items-center justify-center bg-zinc-100 text-xs text-zinc-500">
                      No video
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-4">
                    <p className="font-medium text-zinc-900">{s.title}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {s.groupName} · {s.authorSfuIds?.join(", ")}
                    </p>
                    <p className="mt-2 text-xs text-zinc-500">
                      {vis === "PUBLIC" ? "Public" : "Class only"} ·{" "}
                      {new Date(s.createdAt).toLocaleDateString()}
                    </p>
                    <span className="mt-3 text-sm font-medium text-red-800">Open & comment →</span>
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
