import Link from "next/link";
import { SignInGoogle } from "@/components/SignInGoogle";

type Persona = "instructor" | "student";

const copy: Record<
  Persona,
  { title: string; blurb: string; postLogin: string }
> = {
  instructor: {
    title: "Instructor sign in",
    blurb: "Create classes, share join codes, review submissions, and moderate feedback. Use your SFU account or Google (if enabled).",
    postLogin: "/dashboard?persona=instructor",
  },
  student: {
    title: "Student sign in",
    blurb: "Join a class with a code from your instructor, submit group projects and videos, and comment on classmates’ work.",
    postLogin: "/dashboard?persona=student",
  },
};

export async function AuthLoginForm({
  persona,
  searchParams,
  showBackLink = true,
}: {
  persona: Persona;
  searchParams: Promise<{ error?: string }>;
  /** When false, omit the top link (e.g. student sign-in on `/`). */
  showBackLink?: boolean;
}) {
  const sp = await searchParams;
  const c = copy[persona];
  const enableGoogle = process.env.ENABLE_GOOGLE === "true";
  const enableCas = process.env.ENABLE_CAS === "true";
  const googleConfigured =
    Boolean(process.env.AUTH_GOOGLE_ID?.trim()) && Boolean(process.env.AUTH_GOOGLE_SECRET?.trim());
  const casHref = `/api/auth/cas/login?persona=${persona}`;
  const backLabel = persona === "instructor" ? "← Student site" : "← Home";

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      {showBackLink && (
        <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-900">
          {backLabel}
        </Link>
      )}
      <h1 className={`${showBackLink ? "mt-4" : "mt-0"} text-2xl font-semibold`}>{c.title}</h1>
      <p className="mt-2 text-sm text-zinc-600">{c.blurb}</p>
      {sp.error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {decodeURIComponent(sp.error)}
        </p>
      )}
      <div className="mt-8 flex flex-col gap-3">
        {enableCas && (
          <Link
            prefetch={false}
            href={casHref}
            className="flex w-full items-center justify-center rounded-lg bg-red-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-800"
          >
            SFU CAS
          </Link>
        )}
        {enableGoogle && googleConfigured && <SignInGoogle callbackUrl={c.postLogin} />}
        {enableGoogle && !googleConfigured && (
          <p className="text-sm text-amber-800">
            Google is enabled but OAuth is incomplete: set{" "}
            <code className="rounded bg-amber-100 px-1">AUTH_GOOGLE_ID</code> and{" "}
            <code className="rounded bg-amber-100 px-1">AUTH_GOOGLE_SECRET</code>.
          </p>
        )}
        {!enableCas && !enableGoogle && (
          <p className="text-sm text-amber-800">
            Set <code className="rounded bg-amber-100 px-1">ENABLE_GOOGLE=true</code> or{" "}
            <code className="rounded bg-amber-100 px-1">ENABLE_CAS=true</code> in your environment.
          </p>
        )}
      </div>
    </div>
  );
}
