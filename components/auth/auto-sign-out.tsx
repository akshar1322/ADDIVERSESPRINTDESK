"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

import { authClient } from "@/lib/auth-client";

export function AutoSignOut() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      await fetch("/api/employee-sessions/current", { method: "DELETE" }).catch(() => null);
      await authClient.signOut().catch(() => null);
      router.replace("/sign-in");
      router.refresh();
    });
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className={isPending ? "size-4 animate-spin" : "size-4"} />
        Signing out...
      </div>
    </main>
  );
}
