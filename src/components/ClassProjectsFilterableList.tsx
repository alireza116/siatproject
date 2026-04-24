"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { projectMatchesSearchFields } from "@/lib/project-search";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type ClassProjectRow = {
  id: string;
  title: string;
  groupName: string;
  description?: string;
  authorNames: string[];
  authorSfuIds: string[];
  youtubeThumbId?: string;
  visibility: "PUBLIC" | "PRIVATE";
  ratingText: string;
  createdAtIso: string;
  isOwnGroup: boolean;
  reviewed: boolean;
  needsReview: boolean;
  reviewerLabels: string[];
};

type Props = {
  classId: string;
  showGroupHints: boolean;
  rows: ClassProjectRow[];
};

export function ClassProjectsFilterableList({ classId, showGroupHints, rows }: Props) {
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
        <Label htmlFor="class-projects-search">Search projects</Label>
        <Input
          id="class-projects-search"
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
            : `${rows.length} project${rows.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
          No projects match &ldquo;{query.trim()}&rdquo;. Try fewer or different keywords.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((s) => (
            <li key={s.id}>
              <Link
                href={`/classes/${classId}/submissions/${s.id}`}
                className={cn(
                  "group flex flex-col gap-4 overflow-hidden rounded-xl border bg-card p-3 shadow-sm transition hover:border-foreground/20 hover:shadow sm:flex-row sm:items-stretch sm:p-4",
                  s.isOwnGroup
                    ? "border-border"
                    : s.reviewed
                      ? "border-emerald-500/30"
                      : s.needsReview
                        ? "border-amber-500/40"
                        : "border-border",
                )}
              >
                <div className="relative w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:w-56 md:w-64">
                  <div className="relative aspect-video">
                    {s.youtubeThumbId ? (
                      <Image
                        src={`https://img.youtube.com/vi/${s.youtubeThumbId}/mqdefault.jpg`}
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
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      {s.isOwnGroup && showGroupHints && (
                        <Badge
                          variant="outline"
                          className="border-foreground/20 text-[10px] text-foreground"
                        >
                          Your group
                        </Badge>
                      )}
                      {!s.isOwnGroup && s.reviewed && (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-400"
                        >
                          Reviewed by your group
                        </Badge>
                      )}
                      {s.needsReview && (
                        <Badge
                          variant="outline"
                          className="border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400"
                        >
                          Needs review
                        </Badge>
                      )}
                      <Badge
                        variant={s.visibility === "PUBLIC" ? "secondary" : "outline"}
                        className="text-[10px]"
                      >
                        {s.visibility === "PUBLIC" ? "Public" : "Class only"}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {s.groupName}
                    {s.authorSfuIds.length > 0 && ` · ${s.authorSfuIds.join(", ")}`}
                  </p>
                  {s.description && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Rating: {s.ratingText}</p>
                  {!s.isOwnGroup && s.reviewed && s.reviewerLabels.length > 0 && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      Reviewed by: {s.reviewerLabels.join(", ")}
                    </p>
                  )}
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
