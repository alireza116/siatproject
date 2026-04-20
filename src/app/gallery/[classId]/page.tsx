import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listPublicSubmissionsForClass } from "@/lib/gallery";
import { getClassById, toLeanClassFull } from "@/lib/firestore/classes";
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

  const clsRaw = await getClassById(classId);
  if (!clsRaw) notFound();
  const cls = toLeanClassFull(clsRaw);

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
        <ul className="mt-8 flex flex-col gap-3">
          {items.map((s) => {
            const r = ratings.get(s._id);
            const ratingText =
              !r || r.count === 0
                ? "Not rated yet"
                : `${r.average.toFixed(1)} / 5 · ${r.count} ${r.count === 1 ? "rating" : "ratings"}`;
            return (
              <li key={s._id}>
                <Link
                  href={`/gallery/${classId}/${s._id}`}
                  className="group flex flex-col gap-4 overflow-hidden rounded-xl border border-border bg-card p-3 shadow-sm transition hover:border-foreground/20 hover:shadow sm:flex-row sm:items-stretch sm:p-4"
                >
                  <div className="relative w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:w-56 md:w-64">
                    <div className="relative aspect-video">
                      {s.firstYoutubeId ? (
                        <Image
                          src={`https://img.youtube.com/vi/${s.firstYoutubeId}/mqdefault.jpg`}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 768px) 224px, 256px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                          No video
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-2 sm:py-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-medium text-foreground">{s.title}</p>
                      <Badge variant="secondary" className="text-[10px]">
                        Public
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.groupName}</p>
                    <p className="text-xs text-muted-foreground">Rating: {ratingText}</p>
                    <p className="mt-auto text-xs text-muted-foreground">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </p>
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
