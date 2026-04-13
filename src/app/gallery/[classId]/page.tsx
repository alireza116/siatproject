import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listPublicSubmissionsForClass } from "@/lib/gallery";
import { dbConnect } from "@/lib/db/connect";
import { ClassModel } from "@/lib/models/Class";
import { leanOne } from "@/lib/mongoose-lean";
import type { LeanClassFull } from "@/lib/types/lean";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getRatingStatsBySubmissionIds } from "@/lib/feedback";

export default async function ClassGalleryPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;

  await dbConnect();
  const cls = leanOne<LeanClassFull>(await ClassModel.findById(classId).lean());
  if (!cls) notFound();

  const items = await listPublicSubmissionsForClass(classId);
  const ratings = await getRatingStatsBySubmissionIds(items.map((s) => s._id));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link
        href="/gallery"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 mb-2 text-muted-foreground")}
      >
        ← Gallery
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight">{cls.title}</h1>
      {cls.description && (
        <p className="mt-1 text-sm text-muted-foreground">{cls.description}</p>
      )}

      {items.length === 0 ? (
        <div className="mt-10 rounded-xl border border-border bg-card px-8 py-12 text-center">
          <p className="text-sm text-muted-foreground">No public submissions yet.</p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {items.map((s) => {
            return (
              <li key={s._id}>
                <Link
                  href={`/gallery/${classId}/${s._id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:border-foreground/20 hover:shadow"
                >
                  {s.firstYoutubeId ? (
                  <div className="relative aspect-video bg-muted">
                    <Image
                      src={`https://img.youtube.com/vi/${s.firstYoutubeId}/mqdefault.jpg`}
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
                    <p className="mt-1 text-xs text-muted-foreground">{s.groupName}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {(() => {
                        const r = ratings.get(s._id);
                        if (!r || r.count === 0) return "Rating: not rated yet";
                        return `Rating: ${r.average.toFixed(1)} / 5 (${r.count})`;
                      })()}
                    </p>
                    <div className="mt-auto pt-3 flex items-center justify-between">
                      <Badge variant="secondary" className="text-[10px]">Public</Badge>
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
