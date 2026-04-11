import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SfuIdForm } from "./sfu-id-form";

export default async function OnboardingSfuPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }
  if (session.user.sfuId) {
    redirect("/dashboard");
  }
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold">SFU ID</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Enter your SFU computing ID (e.g. <code className="rounded bg-zinc-100 px-1">jsmith</code>) or your
        9-digit student number. This is shown to instructors with your submissions.
      </p>
      <SfuIdForm />
    </div>
  );
}
