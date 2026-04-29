"use client";

import { usePathname } from "next/navigation";

type Props = {
  children: React.ReactNode;
  /** Server-rendered nav chrome (ViewAsBar + SiteHeader). Omitted on /embed/* routes. */
  chrome: React.ReactNode;
};

export function AppShell({ children, chrome }: Props) {
  const pathname = usePathname();
  const embed = pathname?.startsWith("/embed/") ?? false;

  if (embed) {
    return (
      <main className="min-h-0 flex-1 bg-muted/30">{children}</main>
    );
  }

  return (
    <>
      {chrome}
      <main className="flex-1">{children}</main>
    </>
  );
}
