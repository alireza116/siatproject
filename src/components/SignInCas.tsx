import Link from "next/link";

export function SignInCas() {
  return (
    <Link
      prefetch={false}
      href="/api/auth/cas/login"
      className="flex w-full items-center justify-center rounded-lg bg-red-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-800"
    >
      Sign in with SFU
    </Link>
  );
}
