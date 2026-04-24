import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserById } from "@/lib/firestore/users";
import { appDisplayLabel } from "@/lib/display-name";
import { DisplayNameForm } from "./display-name-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const user = await getUserById(session.user.id);
  const displayName = user?.displayName?.trim() ?? "";
  const preview = appDisplayLabel({
    displayName: user?.displayName,
    sfuId: user?.sfuId ?? session.user.sfuId,
    name: user?.name,
  });

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Link
        href="/dashboard"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 mb-2 text-muted-foreground")}
      >
        ← Dashboard
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage how your name appears when you comment, appear on projects, and see greetings in the app.
      </p>

      <Separator className="my-8" />

      <section className="space-y-6">
        <div>
          <h2 className="text-base font-semibold">Profile</h2>
          {session.user.sfuId && (
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">SFU computing ID</span>{" "}
              <code className="rounded bg-muted px-1.5 font-mono text-foreground">{session.user.sfuId}</code>
              <span className="block mt-1 text-xs">Your ID is fixed and used for enrollment and auth.</span>
            </p>
          )}
          <p className="mt-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Shown as</span>{" "}
            <span className="text-foreground">{preview}</span>
            <span className="block mt-1 text-xs">
              This is what others see next to your activity, based on your display name and ID.
            </span>
          </p>
        </div>

        <DisplayNameForm initialDisplayName={displayName} sfuId={session.user.sfuId} />
      </section>
    </div>
  );
}
