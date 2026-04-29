"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Copies `/embed/gallery/{classId}` — public view with no app navigation. */
export function ShareClassGalleryButton({ classId }: { classId: string }) {
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(false);

  async function copy() {
    setErr(false);
    const path = `/embed/gallery/${classId}`;
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${path}`
        : path;
    try {
      await navigator.clipboard.writeText(url);
      setDone(true);
      window.setTimeout(() => setDone(false), 2000);
    } catch {
      setErr(true);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={copy} className="gap-1.5">
        {done ? (
          <Check className="size-3.5 text-emerald-600" aria-hidden />
        ) : (
          <Link2 className="size-3.5" aria-hidden />
        )}
        {done ? "Copied link" : "Share public gallery"}
      </Button>
      {err && (
        <span className="text-xs text-destructive" role="status">
          Clipboard unavailable — copy manually: …/embed/gallery/{classId}
        </span>
      )}
    </div>
  );
}
