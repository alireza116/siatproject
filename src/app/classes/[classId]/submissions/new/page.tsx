import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { canAccessClass } from "@/lib/class-access";
import { dbConnect } from "@/lib/db/connect";
import { ClassModel } from "@/lib/models/Class";
import { leanOne } from "@/lib/mongoose-lean";
import type { LeanClassFull } from "@/lib/types/lean";
import { SubmissionForm } from "@/components/SubmissionForm";

export default async function NewSubmissionPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if (!session.user.sfuId) redirect("/onboarding/sfu-id");

  await dbConnect();
  const cls = leanOne<LeanClassFull>(await ClassModel.findById(classId).lean());
  if (!cls) notFound();

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

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Link href={`/classes/${classId}`} className="text-sm text-zinc-600 hover:text-zinc-900">
        ← {cls.title}
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">New submission</h1>
      <SubmissionForm mode="create" classId={classId} showVisibility />
    </div>
  );
}
