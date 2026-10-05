import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Menu, Search, X } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type WorkspaceItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export function WorkspaceShell({
  role,
  title,
  subtitle,
  items,
  children,
  tone = "seller",
}: {
  role: string;
  title: string;
  subtitle: string;
  items: WorkspaceItem[];
  children: React.ReactNode;
  tone?: "seller" | "admin";
}) {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (state) => state.location.pathname });
  const active = (item: WorkspaceItem) => item.exact ? path === item.to : path.startsWith(item.to);

  const navigation = (
    <>
      <div className="flex items-center gap-3 px-4 pb-7 pt-3">
        <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl font-display text-xl font-extrabold", tone === "seller" ? "bg-primary text-primary-foreground" : "bg-card text-foreground")}>
          K
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-bold">{title}</p>
          <p className="truncate text-xs opacity-65">{subtitle}</p>
        </div>
      </div>
      <nav className="space-y-1 px-3" aria-label={`${role} navigation`}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors",
                active(item)
                  ? tone === "seller" ? "bg-primary text-primary-foreground shadow-sm" : "bg-card text-foreground shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-3 pb-5 pt-8">
        <Link to="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold opacity-70 transition hover:opacity-100">
          <ArrowLeft className="h-4 w-4" /> Back to marketplace
        </Link>
      </div>
    </>
  );

  return (
    <div className={cn("workspace-shell md:grid md:grid-cols-[230px_minmax(0,1fr)]", tone === "admin" && "workspace-admin")}>
      <aside className="sticky top-[60px] hidden h-[calc(100vh-76px)] flex-col rounded-2xl bg-sidebar text-sidebar-foreground md:flex">
        {navigation}
      </aside>

      {open && (
        <div className="fixed inset-0 z-[70] md:hidden">
          <button className="absolute inset-0 bg-foreground/35" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-[82%] max-w-xs flex-col bg-sidebar py-4 text-sidebar-foreground shadow-2xl">
            <Button variant="ghost" size="icon" className="absolute right-3 top-3" onClick={() => setOpen(false)} aria-label="Close menu">
              <X />
            </Button>
            {navigation}
          </aside>
        </div>
      )}

      <div className="min-w-0">
        <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:px-6">
          <Button variant="outline" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu />
          </Button>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase text-primary">{role}</p>
            <p className="truncate font-display text-lg font-bold">{path === "/seller" || path === "/admin" ? "Overview" : items.find(active)?.label ?? "Workspace"}</p>
          </div>
          <Button asChild variant="outline" size="icon">
            <Link to="/search" aria-label="Search marketplace"><Search /></Link>
          </Button>
        </header>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}