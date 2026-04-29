"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { Menu, X } from "lucide-react";
import { SignOutButton } from "@/components/SignOutButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinkClass =
  "rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:py-1.5";

type Props = {
  signedIn: boolean;
};

const clientSnapshot = () => true;
const serverSnapshot = () => false;
const emptySubscribe = () => () => {};

export function SiteHeaderNav({ signedIn }: Props) {
  const [open, setOpen] = useState(false);
  const mounted = useSyncExternalStore(emptySubscribe, clientSnapshot, serverSnapshot);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <nav
        className="hidden items-center gap-1 text-sm md:flex"
        aria-label="Main"
      >
        {signedIn ? (
          <>
            <Link href="/my-submissions" className={navLinkClass}>
              My submissions
            </Link>
            <Link href="/dashboard" className={navLinkClass}>
              Dashboard
            </Link>
            <Link href="/gallery" className={navLinkClass}>
              Gallery
            </Link>
            <Link href="/account" className={navLinkClass}>
              Account
            </Link>
            <SignOutButton />
          </>
        ) : (
          <>
            <Link href="/gallery" className={navLinkClass}>
              Gallery
            </Link>
            <Link href="/" className={navLinkClass}>
              Sign in
            </Link>
          </>
        )}
      </nav>

      <div className="md:hidden">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground"
          aria-expanded={open}
          aria-controls={open ? titleId : undefined}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {open &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[200] md:hidden" role="presentation">
            <button
              type="button"
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              aria-label="Close menu"
              onClick={close}
            />
            <div
              id={titleId}
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${titleId}-label`}
              className={cn(
                "absolute inset-y-0 right-0 flex h-dvh max-h-dvh w-full max-w-sm flex-col border-l border-border bg-background shadow-lg"
              )}
            >
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
                <span id={`${titleId}-label`} className="text-sm font-semibold text-foreground">
                  Menu
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  aria-label="Close menu"
                  onClick={close}
                >
                  <X className="size-5" />
                </Button>
              </div>
              <nav
                className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-4 text-sm text-foreground"
                aria-label="Main"
              >
                {signedIn ? (
                  <>
                    <Link
                      href="/my-submissions"
                      className={cn(navLinkClass, "text-foreground")}
                      onClick={close}
                    >
                      My submissions
                    </Link>
                    <Link href="/dashboard" className={cn(navLinkClass, "text-foreground")} onClick={close}>
                      Dashboard
                    </Link>
                    <Link href="/gallery" className={cn(navLinkClass, "text-foreground")} onClick={close}>
                      Gallery
                    </Link>
                    <Link href="/account" className={cn(navLinkClass, "text-foreground")} onClick={close}>
                      Account
                    </Link>
                    <div className="mt-2 border-t border-border pt-4">
                      <SignOutButton />
                    </div>
                  </>
                ) : (
                  <>
                    <Link href="/gallery" className={cn(navLinkClass, "text-foreground")} onClick={close}>
                      Gallery
                    </Link>
                    <Link href="/" className={cn(navLinkClass, "text-foreground")} onClick={close}>
                      Sign in
                    </Link>
                  </>
                )}
              </nav>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
