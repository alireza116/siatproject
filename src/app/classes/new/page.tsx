import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { CreateClassForm } from "./create-class-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      <Link
        href="/dashboard"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 mb-2 text-muted-foreground")}
      >
        ← Dashboard
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Create a class</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Students join with the generated code after you create the class.
      </p>
      <CreateClassForm />
    </div>
  );
}
