import Link from "next/link";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/SignOutButton";

export async function SiteHeader() {
  const session = await auth();
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 h-14">
        <Link href="/" className="text-sm font-semibold tracking-tight text-foreground">
          SFU Project Hub
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {session ? (
            <>
              <Link
                href="/my-submissions"
                className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                My submissions
              </Link>
              <Link
                href="/dashboard"
                className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Dashboard
              </Link>
              <Link
                href="/gallery"
                className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Gallery
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/gallery"
                className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Gallery
              </Link>
              <Link
                href="/"
                className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Sign in
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
