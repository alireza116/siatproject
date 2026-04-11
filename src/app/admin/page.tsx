import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db/connect";
import { User } from "@/lib/models/User";
import { getBootstrapAdminIds } from "@/lib/admin";
import { grantAdminAction, revokeAdminAction } from "@/app/admin/actions";
import Link from "next/link";

type AdminUser = { sfuId: string; name?: string; bootstrap: boolean };

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.role !== "GLOBAL_ADMIN") {
    redirect("/dashboard");
  }

  await dbConnect();
  const bootstrapIds = getBootstrapAdminIds();
  const dbAdmins = await User.find({ role: "GLOBAL_ADMIN" }).lean() as {
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
  // Bootstrap admins who haven't signed in yet won't be in the DB.
  for (const id of bootstrapIds) {
    if (!seen.has(id)) {
      admins.push({ sfuId: id, bootstrap: true });
    }
  }
  admins.sort((a, b) => a.sfuId.localeCompare(b.sfuId));

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Dashboard
        </Link>
      </div>
      <h1 className="mt-4 text-2xl font-semibold">Admin management</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Admins can create and manage classes. Bootstrap admins (from{" "}
        <code className="rounded bg-zinc-100 px-1">ADMIN_SFU_IDS</code>) are always promoted on
        login and can only be removed by editing that environment variable.
      </p>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-zinc-900">Current admins</h2>
        <div className="mt-3 rounded-lg border border-zinc-200 bg-white">
          {admins.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">No admins found.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {admins.map((a) => (
                <li key={a.sfuId} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div>
                    <span className="font-mono text-sm">{a.sfuId}</span>
                    {a.name && <span className="ml-2 text-sm text-zinc-500">{a.name}</span>}
                    {a.bootstrap && (
                      <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500">
                        bootstrap
                      </span>
                    )}
                  </div>
                  {!a.bootstrap && (
                    <form action={revokeAdminAction}>
                      <input type="hidden" name="sfuId" value={a.sfuId} />
                      <button
                        type="submit"
                        className="text-xs text-red-700 hover:underline"
                      >
                        Revoke
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-zinc-900">Grant admin</h2>
        <p className="mt-1 text-sm text-zinc-500">
          The user must have signed in at least once before you can grant them admin access.
        </p>
        <form action={grantAdminAction} className="mt-3 flex gap-2">
          <input
            type="text"
            name="sfuId"
            placeholder="SFU ID (e.g. jsmith)"
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            required
          />
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Grant
          </button>
        </form>
      </section>
    </div>
  );
}
