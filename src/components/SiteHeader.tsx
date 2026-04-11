import Link from "next/link";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/SignOutButton";

export async function SiteHeader() {
  const session = await auth();
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-semibold text-zinc-900">
          SFU Project Hub
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/gallery" className="text-zinc-600 hover:text-zinc-900">
            Public gallery
          </Link>
          {session ? (
            <>
              <Link href="/dashboard" className="text-zinc-600 hover:text-zinc-900">
                Dashboard
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link href="/" className="text-zinc-600 hover:text-zinc-900">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
