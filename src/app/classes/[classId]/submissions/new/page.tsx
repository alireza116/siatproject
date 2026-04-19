import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { canAccessClassOrGlobalAdmin, getStudentSubmissionPrivileges, isClassAppManager } from "@/lib/class-access";
import { getClassById, toLeanClassFull } from "@/lib/firestore/classes";
import { SubmissionForm } from "@/components/SubmissionForm";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getViewAsUserId } from "@/lib/view-as";

export default async function NewSubmissionPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if (!session.user.sfuId) redirect("/onboarding/sfu-id");

  const viewAsUserId = await getViewAsUserId(session.user.role);
  const effectiveUserId = viewAsUserId ?? session.user.id;

  const clsRaw = await getClassById(classId);
  if (!clsRaw) notFound();
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

  const classManager =
    !viewAsUserId &&
    (await isClassAppManager(session.user.id, classId, {
      globalRole: session.user.role,
      viewAsActive: false,
    }));
  const priv = await getStudentSubmissionPrivileges(effectiveUserId, classId);
  const showVisibility = classManager || priv.canChangeVisibility;

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Link
        href={`/classes/${classId}`}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 mb-2 text-muted-foreground")}
      >
        ← {cls.title}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">New submission</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Add your project links and YouTube demo video.
      </p>
      {!showVisibility && (
        <p className="mt-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Visibility defaults to the class setting until your instructor enables public/private
          controls for you.
        </p>
      )}
      <SubmissionForm mode="create" classId={classId} showVisibility={showVisibility} />
    </div>
  );
}
