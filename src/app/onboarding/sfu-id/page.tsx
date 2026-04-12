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
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Set your SFU ID</h1>
          <p className="text-sm text-muted-foreground">
            Enter your SFU computing ID (e.g.{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">jsmith</code>) or
            9-digit student number. This is shown alongside your submissions.
          </p>
        </div>
        <SfuIdForm />
      </div>
    </div>
  );
}
