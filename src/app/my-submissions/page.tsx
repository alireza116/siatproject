import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getClassesByIds, toLeanClassFull } from "@/lib/firestore/classes";
import { listSubmissionsForUser, toLeanSubmissionFull } from "@/lib/firestore/submissions";
import { getViewAsUserId } from "@/lib/view-as";
import { effectiveVisibility } from "@/lib/visibility";
import type { LeanClassFull, LeanSubmissionFull } from "@/lib/types/lean";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getRatingStatsBySubmissionIds } from "@/lib/feedback";

export default async function MySubmissionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if (!session.user.sfuId) redirect("/onboarding/sfu-id");

  const viewAsUserId = await getViewAsUserId(session.user.role);
  const effectiveUserId = viewAsUserId ?? session.user.id;

  const subsRaw = await listSubmissionsForUser(effectiveUserId);
  const subs = subsRaw.map(toLeanSubmissionFull);

  const classIds = [...new Set(subs.map((s) => s.classId))];
  const classesRaw = await getClassesByIds(classIds);
  const classes = classesRaw.map(toLeanClassFull);
  const classById = new Map(classes.map((c) => [c._id, c]));

  const rows = subs
    .map((s) => {
      const cls = classById.get(s.classId);
      if (!cls) return null;
      return { s, cls };
    })
    .filter((r): r is { s: LeanSubmissionFull; cls: LeanClassFull } => r !== null);
  const ratings = await getRatingStatsBySubmissionIds(rows.map((r) => r.s._id));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My submissions</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Projects you created or are listed on as an author, across your classes.
          </p>
        </div>
        <Link href="/dashboard" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Dashboard
        </Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-border bg-card">
        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            You don&apos;t have any submissions yet. Open a class you&apos;re enrolled in and create one.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map(({ s, cls }) => {
              const vis = effectiveVisibility(s, cls);
              const classId = s.classId;
              return (
                <li key={s._id}>
                  <Link
                    href={`/classes/${classId}/submissions/${s._id}`}
                    className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{s.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/90">{cls.title}</span>
                        {" · "}
                        {s.groupName}
                        {s.authorSfuIds?.length > 0 && ` · ${s.authorSfuIds.join(", ")}`}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {(() => {
                          const r = ratings.get(s._id);
                          if (!r || r.count === 0) return "Rating: not rated yet";
                          return `Rating: ${r.average.toFixed(1)} / 5 (${r.count})`;
                        })()}
                      </p>
                    </div>
                    <Badge variant={vis === "PUBLIC" ? "secondary" : "outline"} className="shrink-0 text-[10px]">
                      {vis === "PUBLIC" ? "Public" : "Class only"}
                    </Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
