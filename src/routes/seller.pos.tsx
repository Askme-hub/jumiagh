import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Calculator, Package, Receipt, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/seller/pos")({
  component: PosLayout,
  head: () => ({
    meta: [
      { title: "POS Dashboard — Kivora Seller" },
      { name: "description", content: "Point of sale, inventory and walk-in sales for your shop." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const TABS = [
  { to: "/seller/pos", label: "Sell", icon: Calculator, exact: true },
  { to: "/seller/pos/inventory", label: "Inventory", icon: Package },
  { to: "/seller/pos/sales", label: "Sales", icon: Receipt },
  { to: "/seller/pos/import", label: "Import", icon: Upload },
] as const;

function PosLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname.replace(/\/$/, "") || "/" });

  return (
    <div className="dashboard-canvas min-h-full">
      <div className="border-b border-border bg-card/80 px-4 pt-4 md:px-6">
        <div className="mb-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Seller POS</p>
          <h1 className="font-display text-xl font-bold tracking-tight md:text-2xl">POS Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Walk-in sales, stock control and barcodes — separate from online orders.
          </p>
        </div>
        <nav className="flex gap-1 overflow-x-auto scrollbar-none" aria-label="POS sections">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active =
              "exact" in tab && tab.exact
                ? path === "/seller/pos"
                : path.startsWith(tab.to) && tab.to !== "/seller/pos";
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-t-xl px-4 py-2.5 text-sm font-semibold transition",
                  active
                    ? "border-b-2 border-primary bg-primary/5 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
