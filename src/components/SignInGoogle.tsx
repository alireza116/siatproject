"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

type Props = {
  callbackUrl?: string;
};

export function SignInGoogle({ callbackUrl = "/dashboard" }: Props) {
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full"
      onClick={() => signIn("google", { callbackUrl })}
    >
      Continue with Google
    </Button>
  );
}
