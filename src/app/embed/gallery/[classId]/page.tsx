import Link from "next/link";
import { notFound } from "next/navigation";
import { listPublicSubmissionsForClass } from "@/lib/gallery";
import { getClassById, toLeanClassFull } from "@/lib/firestore/classes";
import { getRatingStatsBySubmissionIds } from "@/lib/feedback";
import { GalleryProjectsFilterableList } from "@/components/GalleryProjectsFilterableList";

/** Public class gallery without site navigation (opened from shared `/embed/gallery/[classId]` links). */
export default async function EmbedClassGalleryPage({
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Link href="/" className="hover:text-foreground hover:underline">
              SFU Project Hub
            </Link>
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{cls.title}</h1>
          {cls.description && (
            <p className="mt-1 text-sm text-muted-foreground">{cls.description}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">Public projects</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-10 rounded-xl border border-border bg-card px-8 py-12 text-center">
          <p className="text-sm text-muted-foreground">No public submissions yet.</p>
        </div>
      ) : (
        <div className="mt-8">
          <GalleryProjectsFilterableList
            classId={classId}
            galleryBasePath="/embed/gallery"
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
