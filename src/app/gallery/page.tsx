import Link from "next/link";
import { listPublicSubmissions } from "@/lib/gallery";

export default async function GalleryPage() {
  const items = await listPublicSubmissions();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Public gallery</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Submissions instructors or authors marked as public appear here.
      </p>
      <ul className="mt-8 divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
        {items.length === 0 ? (
          <li className="p-6 text-sm text-zinc-600">Nothing public yet.</li>
        ) : (
          items.map((s) => (
            <li key={s._id}>
              <Link
                href={`/gallery/${s._id}`}
                className="flex flex-col gap-1 px-4 py-4 hover:bg-zinc-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{s.title}</p>
                  <p className="text-xs text-zinc-500">
                    {s.classTitle} · {s.groupName}
                  </p>
                </div>
                <span className="text-xs text-zinc-400">
                  {new Date(s.createdAt).toLocaleDateString()}
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
