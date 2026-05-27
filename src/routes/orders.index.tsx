import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SearchBar } from "@/components/SearchBar";
import { formatGHC } from "@/lib/store";

export const Route = createFileRoute("/orders/")({
  component: Orders,
  head: () => ({ meta: [{ title: "Orders – Jumia Ghana" }] }),
});

const statusLabel: Record<string, { text: string; tone: string }> = {
  pending_payment: { text: "AWAITING PAYMENT", tone: "bg-secondary text-foreground" },
  placed: { text: "ORDER PLACED", tone: "bg-secondary text-foreground" },
  pending_confirmation: { text: "PENDING", tone: "bg-secondary text-foreground" },
  waiting_to_be_shipped: { text: "PROCESSING", tone: "bg-secondary text-foreground" },
  shipped: { text: "SHIPPED", tone: "bg-[#3b82f6] text-white" },
  available_for_pickup: { text: "READY FOR PICKUP", tone: "bg-[#3b82f6] text-white" },
  delivered: { text: "DELIVERED", tone: "bg-success text-white" },
  cancelled: { text: "CANCELLED", tone: "bg-destructive text-white" },
};

function Orders() {
  const [tab, setTab] = useState<"ongoing" | "cancelled">("ongoing");

  const { data, isLoading } = useQuery({
    queryKey: ["orders", tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, status, total, item_count, created_at, order_items(name, image_url)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = (data ?? []).filter((o) =>
    tab === "cancelled" ? o.status === "cancelled" : o.status !== "cancelled"
  );

  return (
    <div>
      <SearchBar />
      <h1 className="px-4 py-4 text-2xl font-bold border-t border-border">Orders</h1>

      <div className="flex border-b border-border bg-card">
        {(["ongoing", "cancelled"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wide ${
              tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
            }`}
          >
            {t === "ongoing" ? "Ongoing/Delivered" : "Cancelled/Returned"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="p-6 text-center text-muted-foreground text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="p-10 text-center text-muted-foreground text-sm">No orders here yet.</p>
      ) : (
        filtered.map((o) => {
          const first = o.order_items?.[0];
          const lab = statusLabel[o.status] ?? statusLabel.placed;
          return (
            <Link
              key={o.id}
              to="/orders/status/$id"
              params={{ id: String(o.id) }}
              className="flex gap-3 p-3 bg-card border-b border-border"
            >
              <div className="w-20 h-20 bg-muted shrink-0 rounded">
                {first?.image_url && (
                  <img src={first.image_url} alt="" loading="lazy" className="w-full h-full object-contain" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm line-clamp-1">{first?.name ?? "Order"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Order #{o.order_number}</p>
                <span className={`inline-block mt-1.5 px-2 py-0.5 text-xs font-bold rounded ${lab.tone}`}>
                  {lab.text}
                </span>
                <p className="text-xs mt-1">On {new Date(o.created_at).toLocaleDateString()}</p>
              </div>
              <div className="text-sm font-bold whitespace-nowrap self-center">{formatGHC(Number(o.total))}</div>
            </Link>
          );
        })
      )}
      <div className="h-6" />
    </div>
  );
}
