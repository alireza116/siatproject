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
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

  const submissions = (await Submission.find({ classId: cls._id })
    .sort({ createdAt: -1 })
    .lean()) as unknown as LeanSubmissionFull[];

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
        All submissions for this class. Open one to watch demos, follow project links, and leave feedback.
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
