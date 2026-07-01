import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ModulePlaceholderProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  capabilities: string[];
};

export function ModulePlaceholder({ title, description, icon: Icon, capabilities }: ModulePlaceholderProps) {
  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg border bg-background">
          <Icon className="size-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-muted-foreground">{description}</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Feature scope</CardTitle>
          <CardDescription>This module is ready for the next implementation pass.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((capability) => (
            <div key={capability} className="rounded-lg border bg-muted/30 p-4 text-sm font-medium">
              {capability}
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
