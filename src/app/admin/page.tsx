import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { listGlobalAdmins } from "@/lib/firestore/users";
import { findClassByJoinCode, listAllClasses } from "@/lib/firestore/classes";
import { listStudentEnrollmentsForClass } from "@/lib/firestore/enrollments";
import { countSubmissionsPerClass } from "@/lib/firestore/submissions";
import { listUsersByIds } from "@/lib/firestore/users";
import { getBootstrapAdminIds } from "@/lib/admin";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { RevokeAdminButton, GrantAdminForm } from "@/app/admin/admin-forms";
import { SeedControls } from "@/app/admin/seed-controls";
import { PermanentClassDeleteForm } from "@/app/admin/permanent-class-delete-form";

type AdminUser = { sfuId: string; name?: string; bootstrap: boolean };

const DEMO_JOIN_CODE = "DEMOCLASS";

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.role !== "GLOBAL_ADMIN") {
    redirect("/dashboard");
  }

  const bootstrapIds = getBootstrapAdminIds();
  const dbAdmins = await listGlobalAdmins();

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

  type ExportClass = { _id: string; title: string; joinCode: string; submissionCount: number };
  const allClassRecords = await listAllClasses();
  allClassRecords.sort((a, b) => a.title.localeCompare(b.title));
  const countMap = await countSubmissionsPerClass();
  const exportClasses: ExportClass[] = allClassRecords.map((c) => ({
    _id: c.id,
    title: c.title,
    joinCode: c.joinCode,
    submissionCount: countMap.get(c.id) ?? 0,
  }));

  const demoClassRaw = await findClassByJoinCode(DEMO_JOIN_CODE);
  const demoClass = demoClassRaw
    ? { _id: demoClassRaw.id, title: demoClassRaw.title, joinCode: demoClassRaw.joinCode }
    : null;

  type DemoStudent = { _id: string; sfuId?: string; name?: string };
  let demoStudents: DemoStudent[] = [];
  if (demoClass) {
    const enrollments = await listStudentEnrollmentsForClass(demoClass._id);
    const userIds = enrollments.map((e) => e.userId);
    const users = await listUsersByIds(userIds);
    demoStudents = users.map((u) => ({ _id: u.id, sfuId: u.sfuId, name: u.name }));
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
                  <li key={s._id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{s.sfuId}</span>
                      {s.name && (
                        <span className="text-sm text-muted-foreground">{s.name}</span>
                      )}
                    </div>
                    <a
                      href={`/admin/preview?userId=${s._id}`}
                      className={buttonVariants({ variant: "outline", size: "xs" })}
                    >
                      Preview as
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}

      <Separator className="my-8" />

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-destructive">Danger zone</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Permanently remove a class and every related record in the database. Only available to
            global administrators; all confirmations are verified again on the server before
            anything is deleted.
          </p>
        </div>
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <PermanentClassDeleteForm
            classes={exportClasses.map((c) => ({
              id: c._id,
              title: c.title,
              joinCode: c.joinCode,
              submissionCount: c.submissionCount,
            }))}
          />
        </div>
      </section>

      <Separator className="my-8" />

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
