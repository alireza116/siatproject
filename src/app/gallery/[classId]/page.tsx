import Link from "next/link";
import { notFound } from "next/navigation";
import { listPublicSubmissionsForClass } from "@/lib/gallery";
import { getClassById, toLeanClassFull } from "@/lib/firestore/classes";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getRatingStatsBySubmissionIds } from "@/lib/feedback";
import { GalleryProjectsFilterableList } from "@/components/GalleryProjectsFilterableList";

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
        <div className="mt-8">
          <GalleryProjectsFilterableList
            classId={classId}
            cls={{
              publicShowGroupName: cls.publicShowGroupName,
              publicShowAuthorNames: cls.publicShowAuthorNames,
              publicShowAuthorSfuIds: cls.publicShowAuthorSfuIds,
            }}
            rows={items.map((s) => {
              const r = ratings.get(s._id);
              const ratingText =
                !r || r.count === 0
                  ? "Not rated yet"
                  : `${r.average.toFixed(1)} / 5 · ${r.count} ${r.count === 1 ? "rating" : "ratings"}`;
              return {
                _id: s._id,
                title: s.title,
                groupName: s.groupName,
                description: s.description,
                authorNames: s.authorNames,
                authorSfuIds: s.authorSfuIds,
                firstYoutubeId: s.firstYoutubeId,
                createdAtIso: s.createdAt.toISOString(),
                ratingText,
              };
            })}
          />
        </div>
      )}
    </div>
  );
}
