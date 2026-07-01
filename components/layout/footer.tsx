import { ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-background/50 py-4 px-6 backdrop-blur-xs">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground/80 tracking-tight">PrintFlow</span>
          <span className="text-muted-foreground/30 font-light">|</span>
          <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] font-medium tracking-wide text-muted-foreground">
            TC-1.0.0-001
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground/80">Design & Develop by</span>
          <a
            href="https://www.techcloude.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-0.5 font-medium text-foreground transition-colors hover:text-primary"
          >
            Techcloude
            <ExternalLink className="size-3 text-muted-foreground/50 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
          </a>
        </div>
      </div>
    </footer>
  );
}
