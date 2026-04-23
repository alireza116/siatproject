import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = { href: string; title: string };

type Props = {
  prev: NavItem | null;
  next: NavItem | null;
  current: number; // 1-based
  total: number;
};

/**
 * Step between projects in a class or gallery. Previous uses outline (secondary
 * action); next uses the primary button style so forward navigation reads clearly.
 */
export function ProjectNav({ prev, next, current, total }: Props) {
  return (
    <div
      className="flex flex-col items-stretch gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
      aria-label="Project navigation"
    >
      <div className="min-w-0 flex-1">
        {prev ? (
          <Link
            href={prev.href}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-auto min-h-9 w-full justify-start gap-2 py-2 whitespace-normal sm:max-w-xl"
            )}
            aria-label={`Previous project: ${prev.title}`}
          >
            <span className="shrink-0 text-muted-foreground" aria-hidden>
              ←
            </span>
            <span className="min-w-0 truncate text-left font-medium">{prev.title}</span>
          </Link>
        ) : (
          <p className="flex min-h-9 items-center rounded-lg border border-dashed border-border bg-background/60 px-3 text-sm text-muted-foreground">
            First project
          </p>
        )}
      </div>

      <div className="flex shrink-0 justify-center">
        <span className="rounded-full border border-border bg-background px-4 py-1.5 text-xs font-semibold tabular-nums text-foreground shadow-sm">
          {current} / {total}
        </span>
      </div>

      <div className="min-w-0 flex-1 sm:flex sm:justify-end">
        {next ? (
          <Link
            href={next.href}
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "h-auto min-h-9 w-full justify-end gap-2 py-2 whitespace-normal sm:max-w-xl"
            )}
            aria-label={`Next project: ${next.title}`}
          >
            <span className="min-w-0 truncate text-right font-medium">{next.title}</span>
            <span className="shrink-0 opacity-90" aria-hidden>
              →
            </span>
          </Link>
        ) : (
          <p className="flex min-h-9 items-center justify-end rounded-lg border border-dashed border-border bg-background/60 px-3 text-right text-sm text-muted-foreground sm:ml-auto sm:max-w-xl">
            Last project
          </p>
        )}
      </div>
    </div>
  );
}
