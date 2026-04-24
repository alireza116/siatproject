"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { LeanClassFull } from "@/lib/types/lean";
import { projectMatchesSearchFields } from "@/lib/project-search";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type GalleryProjectRow = {
  _id: string;
  title: string;
  groupName: string;
  description?: string;
  authorNames: string[];
  authorSfuIds: string[];
  firstYoutubeId?: string;
  createdAtIso: string;
  ratingText: string;
};

type Props = {
  classId: string;
  cls: Pick<
    LeanClassFull,
    "publicShowGroupName" | "publicShowAuthorNames" | "publicShowAuthorSfuIds"
  >;
  rows: GalleryProjectRow[];
};

export function GalleryProjectsFilterableList({ classId, cls, rows }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return rows.filter((r) =>
      projectMatchesSearchFields(
        {
          title: r.title,
          groupName: r.groupName,
          description: r.description,
          authorNames: r.authorNames,
          authorSfuIds: r.authorSfuIds,
        },
        query,
      ),
    );
  }, [rows, query]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="gallery-projects-search">Search projects</Label>
        <Input
          id="gallery-projects-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Title, group, authors, SFU IDs, or abstract…"
          autoComplete="off"
          className="max-w-xl"
        />
        <p className="text-xs text-muted-foreground">
          {query.trim()
            ? `${filtered.length} of ${rows.length} shown`
            : `${rows.length} public project${rows.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
          No projects match &ldquo;{query.trim()}&rdquo;. Try fewer or different keywords.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((s) => (
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
                  {cls.publicShowGroupName !== false && s.groupName && (
                    <p className="text-xs text-muted-foreground">{s.groupName}</p>
                  )}
                  {cls.publicShowAuthorNames !== false && s.authorNames.length > 0 && (
                    <p className="text-xs text-muted-foreground">{s.authorNames.join(", ")}</p>
                  )}
                  {cls.publicShowAuthorSfuIds !== false && s.authorSfuIds.length > 0 && (
                    <p className="text-xs text-muted-foreground">{s.authorSfuIds.join(", ")}</p>
                  )}
                  {s.description && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Rating: {s.ratingText}</p>
                  <p className="mt-auto text-xs text-muted-foreground">
                    {new Date(s.createdAtIso).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
