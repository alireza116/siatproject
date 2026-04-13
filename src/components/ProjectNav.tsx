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

export function ProjectNav({ prev, next, current, total }: Props) {
  return (
    <div className="mt-3 flex items-center justify-between gap-2">
      {prev ? (
        <Link
          href={prev.href}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 max-w-[44%] justify-start text-muted-foreground"
          )}
        >
          <span className="truncate">← {prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {current} / {total}
      </span>
      {next ? (
        <Link
          href={next.href}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-mr-2 max-w-[44%] justify-end text-muted-foreground"
          )}
        >
          <span className="truncate">{next.title} →</span>
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
