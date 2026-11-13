import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Calculator, Package, Receipt, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { PosSell } from "@/components/pos/PosSell";
import { PosInventory } from "@/components/pos/PosInventory";
import { PosSales } from "@/components/pos/PosSales";
import { PosImport } from "@/components/pos/PosImport";

export const Route = createFileRoute("/seller/pos")({
  component: PosDashboard,
  head: () => ({
    meta: [
      { title: "POS Dashboard — Kivora Seller" },
      {
        name: "description",
        content: "Point of sale, inventory and walk-in sales for your shop.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Tab = "sell" | "inventory" | "sales" | "import";

const TABS: { id: Tab; label: string; icon: typeof Calculator }[] = [
  { id: "sell", label: "Sell", icon: Calculator },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "sales", label: "Sales", icon: Receipt },
  { id: "import", label: "Import", icon: Upload },
];

function PosDashboard() {
  const [tab, setTab] = useState<Tab>("sell");

  return (
    <div className="dashboard-canvas min-h-full">
      <div className="border-b border-border bg-card/80 px-4 pt-4 md:px-6">
        <div className="mb-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Seller POS
          </p>
          <h1 className="font-display text-xl font-bold tracking-tight md:text-2xl">
            POS Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Walk-in sales, stock control and barcodes — separate from online orders.
          </p>
        </div>

        <nav className="flex gap-1 overflow-x-auto scrollbar-none" aria-label="POS sections">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-t-xl px-4 py-2.5 text-sm font-semibold transition",
                  active
                    ? "border-b-2 border-primary bg-primary/5 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </nav>
      </div>

      <div key={tab}>
        {tab === "sell" && <PosSell />}
        {tab === "inventory" && <PosInventory />}
        {tab === "sales" && <PosSales />}
        {tab === "import" && <PosImport />}
      </div>
    </div>
  );
}
