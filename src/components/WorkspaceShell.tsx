import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Menu, Search, X, LayoutDashboard } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";
import { cn } from "@/lib/utils";

export type WorkspaceItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  group?: string;
  badge?: number;
  /** Show in mobile quick-nav strip */
  quick?: boolean;
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
  const active = (item: WorkspaceItem) =>
    item.exact ? path === item.to || path === `${item.to}/` : path.startsWith(item.to);

  const activeItem = useMemo(
    () => items.find((item) => active(item)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, path],
  );

  const quickItems = useMemo(() => items.filter((i) => i.quick).slice(0, 5), [items]);

  const navigation = (
    <>
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-sidebar-border/60 px-4 pb-5 pt-4">
        <div
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl font-display text-lg font-extrabold shadow-sm",
            tone === "seller"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-foreground",
          )}
        >
          K
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-base font-bold leading-tight">{title}</p>
          <p className="truncate text-[11px] opacity-60">{subtitle}</p>
        </div>
      </div>

      <nav
        className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3"
        aria-label={`${role} navigation`}
      >
        {items.map((item, i) => {
          const Icon = item.icon;
          const showGroup = item.group && item.group !== items[i - 1]?.group;
          const isActive = active(item);
          return (
            <div key={item.to}>
              {showGroup && (
                <p className="mb-1 mt-3 px-3 text-[10px] font-bold uppercase tracking-wider opacity-45 first:mt-0">
                  {item.group}
                </p>
              )}
              <Link
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "group flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-all",
                  isActive
                    ? tone === "seller"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-card text-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition",
                    isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100",
                  )}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {!!item.badge && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10px] font-bold leading-5",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-primary text-primary-foreground",
                    )}
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border/60 px-3 py-3">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold opacity-65 transition hover:bg-sidebar-accent hover:opacity-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to marketplace
        </Link>
      </div>
    </>
  );

  return (
    <div
      className={cn(
        "workspace-shell flex min-h-[calc(100vh-4rem)] flex-col md:grid md:grid-cols-[240px_minmax(0,1fr)]",
        tone === "admin" && "workspace-admin",
      )}
    >
      {/* Desktop sidebar – full height sticky */}
      <aside className="sticky top-0 hidden h-screen max-h-screen flex-col overflow-hidden border-r border-border/60 bg-sidebar text-sidebar-foreground md:flex">
        {navigation}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-[80] md:hidden">
          <button
            className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-full w-[86%] max-w-[300px] flex-col overflow-hidden bg-sidebar text-sidebar-foreground shadow-2xl">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2.5 top-3 z-10"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>
            {navigation}
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sticky header */}
        <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
          <div className="flex items-center gap-3 px-3 py-2.5 md:px-5 md:py-3">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-xl md:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </Button>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-primary">{role}</p>
              <div className="flex items-center gap-1.5">
                {activeItem ? (
                  <activeItem.icon className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
                ) : (
                  <LayoutDashboard className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
                )}
                <p className="truncate font-display text-base font-bold leading-tight md:text-lg">
                  {activeItem?.label ?? "Workspace"}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <NotificationBell />
              <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-xl">
                <Link to="/search" search={{ q: "" }} aria-label="Search marketplace">
                  <Search className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Mobile quick navigate strip — larger touch targets */}
          {quickItems.length > 0 && (
            <div className="flex gap-2 overflow-x-auto border-t border-border/60 px-3 py-2.5 scrollbar-none md:hidden">
              {quickItems.map((item) => {
                const Icon = item.icon;
                const isActive = active(item);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition active:scale-95",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                    {!!item.badge && (
                      <span className="rounded-full bg-background/20 px-1.5 text-[10px] leading-4">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </header>

        {/* Page content */}
        <div className="min-w-0 flex-1 overflow-x-hidden">{children}</div>
      </div>
    </div>
  );
}
