import Link from "next/link";
import { auth } from "@/auth";
import { SiteHeaderNav } from "@/components/SiteHeaderNav";

export async function SiteHeader() {
  const session = await auth();
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <Link href="/" className="text-sm font-semibold tracking-tight text-foreground">
          SFU Project Hub
        </Link>
        <SiteHeaderNav signedIn={!!session} />
      </div>
    </header>
  );
}
