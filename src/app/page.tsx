import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignInCas } from "@/components/SignInCas";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user?.id) {
    if (!session.user.sfuId) {
      redirect("/onboarding/sfu-id");
    }
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const enableCas = process.env.ENABLE_CAS === "true";

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">SFU Project Hub</h1>
      <p className="mt-3 text-base text-zinc-600">
        Submit group project links, browse class work, and leave feedback on classmates&apos; submissions.
      </p>
      {sp.error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {decodeURIComponent(sp.error)}
        </p>
      )}
      <div className="mt-8 flex flex-col gap-3">
        {enableCas && <SignInCas />}
        {!enableCas && (
          <p className="text-sm text-amber-800">
            Set <code className="rounded bg-amber-100 px-1">ENABLE_CAS=true</code> in your environment to enable sign-in.
          </p>
        )}
      </div>
      <p className="mt-8 text-center text-sm text-zinc-500">
        <Link href="/gallery" className="text-zinc-700 underline">
          Public gallery
        </Link>
      </p>
    </div>
  );
}
