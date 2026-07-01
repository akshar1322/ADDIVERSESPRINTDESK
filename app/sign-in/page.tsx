import { redirect } from "next/navigation";

import { SignInForm } from "@/components/auth/sign-in-form";
import { getServerSession } from "@/lib/session";

export default async function SignInPage() {
  const session = await getServerSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
        <section className="hidden lg:block">
          <p className="text-sm font-medium text-blue-600">3D printing production management</p>
          <h1 className="mt-4 max-w-xl text-5xl font-semibold tracking-tight">
            Control orders, printers, people, and delivery promises.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-muted-foreground">
            PrintFlow gives production teams one accountable place for assignments, file previews,
            quantity tracking, notifications, and reporting.
          </p>
        </section>
        <SignInForm />
      </div>
    </main>
  );
}
