import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignInCas } from "@/components/SignInCas";
import { SignInGoogle } from "@/components/SignInGoogle";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

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
  const enableGoogle = process.env.ENABLE_GOOGLE === "true";
  const googleConfigured =
    Boolean(process.env.AUTH_GOOGLE_ID?.trim()) &&
    Boolean(process.env.AUTH_GOOGLE_SECRET?.trim());

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">SFU Project Hub</h1>
          <p className="text-sm text-muted-foreground">
            Submit projects, watch demos, and leave feedback
          </p>
        </div>

        {sp.error && (
          <Alert variant="destructive">
            <AlertDescription>{decodeURIComponent(sp.error)}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {enableCas && <SignInCas />}
          {enableGoogle && googleConfigured && <SignInGoogle callbackUrl="/dashboard" />}
          {enableGoogle && !googleConfigured && (
            <Alert>
              <AlertDescription>
                Google sign-in is enabled but <code className="rounded bg-muted px-1">AUTH_GOOGLE_ID</code> or{" "}
                <code className="rounded bg-muted px-1">AUTH_GOOGLE_SECRET</code> is missing.
              </AlertDescription>
            </Alert>
          )}
          {!enableCas && !enableGoogle && (
            <Alert>
              <AlertDescription>
                No sign-in method is enabled. Set{" "}
                <code className="rounded bg-muted px-1">ENABLE_CAS=true</code> or{" "}
                <code className="rounded bg-muted px-1">ENABLE_GOOGLE=true</code>.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Separator />

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/gallery" className="hover:text-foreground underline underline-offset-4">
            Browse the public gallery
          </Link>
        </p>
      </div>
    </div>
  );
}
