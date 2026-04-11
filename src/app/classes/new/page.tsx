import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CreateClassForm } from "./create-class-form";

export default async function NewClassPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }
  if (!session.user.sfuId) {
    redirect("/onboarding/sfu-id");
  }
  if (session.user.role !== "GLOBAL_ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Link href="/dashboard" className="text-sm text-zinc-600 hover:text-zinc-900">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Create a class</h1>
      <CreateClassForm />
    </div>
  );
}
