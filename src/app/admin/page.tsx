import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db/connect";
import { User } from "@/lib/models/User";
import { ClassModel } from "@/lib/models/Class";
import { Enrollment } from "@/lib/models/Enrollment";
import { Submission } from "@/lib/models/Submission";
import { getBootstrapAdminIds } from "@/lib/admin";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { RevokeAdminButton, GrantAdminForm } from "@/app/admin/admin-forms";
import { SeedControls } from "@/app/admin/seed-controls";

type AdminUser = { sfuId: string; name?: string; bootstrap: boolean };

const DEMO_JOIN_CODE = "DEMOCLASS";

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.role !== "GLOBAL_ADMIN") {
    redirect("/dashboard");
  }

  await dbConnect();

  // --- Admin list ---
  const bootstrapIds = getBootstrapAdminIds();
  const dbAdmins = (await User.find({ role: "GLOBAL_ADMIN" }).lean()) as unknown as {
    sfuId?: string;
    name?: string;
  }[];

  const seen = new Set<string>();
  const admins: AdminUser[] = [];
  for (const u of dbAdmins) {
    const id = u.sfuId?.toLowerCase();
    if (!id) continue;
    seen.add(id);
    admins.push({ sfuId: id, name: u.name, bootstrap: bootstrapIds.includes(id) });
  }
  for (const id of bootstrapIds) {
    if (!seen.has(id)) admins.push({ sfuId: id, bootstrap: true });
  }
  admins.sort((a, b) => a.sfuId.localeCompare(b.sfuId));

  // --- All classes for export ---
  type ExportClass = { _id: { toString(): string }; title: string; submissionCount: number };
  const allClasses = (await ClassModel.find().sort({ title: 1 }).select("_id title").lean()) as unknown as {
    _id: { toString(): string };
    title: string;
  }[];
  const submissionCounts = await Submission.aggregate([
    { $group: { _id: "$classId", count: { $sum: 1 } } },
  ]) as { _id: { toString(): string }; count: number }[];
  const countMap = new Map(submissionCounts.map((r) => [r._id.toString(), r.count]));
  const exportClasses: ExportClass[] = allClasses.map((c) => ({
    _id: c._id,
    title: c.title,
    submissionCount: countMap.get(c._id.toString()) ?? 0,
  }));

  // --- Demo data ---
  const demoClass = (await ClassModel.findOne({ joinCode: DEMO_JOIN_CODE }).lean()) as unknown as {
    _id: { toString(): string };
    title: string;
    joinCode: string;
  } | null;

  type DemoStudent = { _id: { toString(): string }; sfuId?: string; name?: string };
  let demoStudents: DemoStudent[] = [];
  if (demoClass) {
    const enrollments = (await Enrollment.find({ classId: demoClass._id, role: "STUDENT" })
      .select("userId")
      .lean()) as unknown as { userId: { toString(): string } }[];
    const userIds = enrollments.map((e) => e.userId);
    demoStudents = (await User.find({ _id: { $in: userIds } })
      .select("sfuId name")
      .lean()) as unknown as DemoStudent[];
    demoStudents.sort((a, b) => (a.sfuId ?? "").localeCompare(b.sfuId ?? ""));
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href="/dashboard"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 mb-2 text-muted-foreground")}
      >
        ← Dashboard
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>

      {/* ── Demo data ───────────────────────────────────────── */}
      <section className="mt-8 space-y-4">
        <div>
          <h2 className="text-base font-semibold">Demo data</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Seed a demo class with students, submissions, and comments for testing.
          </p>
        </div>

        {demoClass && (
          <div className="rounded-xl border border-border bg-card p-4 text-sm">
            <p className="font-medium text-foreground">{demoClass.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Join code:{" "}
              <code className="font-mono font-medium text-foreground">{demoClass.joinCode}</code>
              {" · "}
              <Link
                href={`/classes/${demoClass._id}`}
                className="underline underline-offset-4 hover:text-foreground"
              >
                Open class
              </Link>
            </p>
          </div>
        )}

        <SeedControls demoExists={!!demoClass} />
      </section>

      {/* ── Student preview ─────────────────────────────────── */}
      {demoClass && demoStudents.length > 0 && (
        <>
          <Separator className="my-8" />
          <section className="space-y-4">
            <div>
              <h2 className="text-base font-semibold">Student preview</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Browse the app exactly as one of the demo students would see it. An amber banner
                appears while in preview mode — click <strong>Exit preview</strong> to return.
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <ul className="divide-y divide-border">
                {demoStudents.map((s) => (
                  <li key={s._id.toString()} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{s.sfuId}</span>
                      {s.name && (
                        <span className="text-sm text-muted-foreground">{s.name}</span>
                      )}
                    </div>
                    <Link
                      href={`/admin/preview?userId=${s._id.toString()}`}
                      className={buttonVariants({ variant: "outline", size: "xs" })}
                    >
                      Preview as
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}

      <Separator className="my-8" />

      {/* ── Export ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Export data</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Download submissions and comments as CSV for each class.
          </p>
        </div>
        {exportClasses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No classes yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <ul className="divide-y divide-border">
              {exportClasses.map((c) => (
                <li key={c._id.toString()} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{c.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.submissionCount} {c.submissionCount === 1 ? "submission" : "submissions"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <a
                      href={`/api/admin/export/submissions?classId=${c._id.toString()}`}
                      className={cn(buttonVariants({ variant: "outline", size: "xs" }))}
                    >
                      Submissions
                    </a>
                    <a
                      href={`/api/admin/export/comments?classId=${c._id.toString()}`}
                      className={cn(buttonVariants({ variant: "outline", size: "xs" }))}
                    >
                      Comments
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <Separator className="my-8" />

      {/* ── Admins ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Admins</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Admins can create and manage classes. Bootstrap admins (from{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">ADMIN_SFU_IDS</code>) are
            always promoted on login.
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {admins.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No admins found.</p>
          ) : (
            <ul className="divide-y divide-border">
              {admins.map((a) => (
                <li key={a.sfuId} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="font-mono text-sm font-medium">{a.sfuId}</span>
                    {a.name && (
                      <span className="truncate text-sm text-muted-foreground">{a.name}</span>
                    )}
                    {a.bootstrap && (
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        bootstrap
                      </Badge>
                    )}
                  </div>
                  {!a.bootstrap && <RevokeAdminButton sfuId={a.sfuId} />}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Grant admin access</h3>
          <p className="text-sm text-muted-foreground">
            The user must have signed in at least once first.
          </p>
          <GrantAdminForm />
        </div>
      </section>
    </div>
  );
}
