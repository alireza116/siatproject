import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { VIEW_AS_COOKIE } from "@/lib/view-as";
import { dbConnect } from "@/lib/db/connect";
import { User } from "@/lib/models/User";

export async function ViewAsBar() {
  const session = await auth();
  if (session?.user?.role !== "GLOBAL_ADMIN") return null;

  const store = await cookies();
  const viewAsUserId = store.get(VIEW_AS_COOKIE)?.value;
  if (!viewAsUserId) return null;

  await dbConnect();
  const student = (await User.findById(viewAsUserId).lean()) as unknown as {
    sfuId?: string;
    name?: string;
  } | null;

  const label = student?.sfuId ?? student?.name ?? viewAsUserId;

  return (
    <div className="flex items-center justify-between gap-3 bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm">
      <span className="text-amber-800">
        Previewing as{" "}
        <strong className="font-semibold font-mono">{label}</strong>
        {" "}— this is a read-only student view.
      </span>
      <Link
        href="/admin/preview-exit"
        className="shrink-0 rounded px-2 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-300 hover:bg-amber-100"
      >
        Exit preview
      </Link>
    </div>
  );
}
