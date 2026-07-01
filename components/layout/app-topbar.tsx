import { Bell, Command, Search } from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";

type AppTopbarProps = {
  user: {
    name?: string | null;
    email: string;
  };
};

export function AppTopbar({ user }: AppTopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="hidden h-9 w-80 items-center gap-2 rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground md:flex">
          <Search className="size-4" />
          Search projects, files, customers
          <Command className="ml-auto size-3.5" />
        </div>
        <div className="md:hidden">
          <p className="font-semibold">PrintFlow</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Notifications">
          <Bell className="size-4" />
        </Button>
        <div className="hidden text-right text-sm sm:block">
          <p className="font-medium leading-none">{user.name ?? "Operator"}</p>
          <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}
