import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export function SignInCas() {
  return (
    <Link
      prefetch={false}
      href="/api/auth/cas/login"
      className={cn(buttonVariants({ size: "lg" }), "w-full")}
    >
      Sign in with SFU
    </Link>
  );
}
