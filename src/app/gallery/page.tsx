import Link from "next/link";
import { listClassesWithPublicSubmissions } from "@/lib/gallery";
import { Badge } from "@/components/ui/badge";

export default async function GalleryPage() {
  const classes = await listClassesWithPublicSubmissions();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Gallery</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Browse public project submissions by class.
      </p>

      <div className="mt-8 overflow-hidden rounded-xl border border-border bg-card">
        {classes.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Nothing public yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {classes.map((c) => (
              <li key={c._id}>
                <Link
                  href={`/gallery/${c._id}`}
                  className="flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{c.title}</p>
                    {c.description && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {c.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {c.publicCount} {c.publicCount === 1 ? "project" : "projects"}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
