import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Package, ChevronRight } from "lucide-react";
import { getSellerOrders } from "@/lib/seller-orders.functions";
import { formatGHC } from "@/lib/store";

export const Route = createFileRoute("/seller/orders/")({ component: SellerOrders });

const FSTYLE: Record<string, string> = {
  processing: "bg-amber-100 text-amber-700",
  shipped: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
};

function SellerOrders() {
  const fetchOrders = useServerFn(getSellerOrders);
  const { data, isLoading } = useQuery({
    queryKey: ["seller-orders"],
    queryFn: () => fetchOrders(),
  });

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading orders…</p>;

  if (!data || data.length === 0) {
    return (
      <div className="p-10 text-center text-muted-foreground">
        <Package size={40} className="mx-auto mb-3 opacity-50" />
        <p>No orders for your products yet.</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3 max-w-3xl mx-auto">
      <p className="text-sm text-muted-foreground">{data.length} order(s) include your products</p>
      {data.map((o) => {
        const statuses = [...new Set(o.items.map((i) => i.fulfillment_status))];
        return (
          <Link
            key={o.id}
            to="/seller/orders/$id"
            params={{ id: o.id }}
            className="block bg-card border border-border rounded-xl p-4 hover:border-primary transition-colors"
          >
            <div className="flex justify-between items-start">
              <div className="min-w-0">
                <p className="font-bold text-sm">#{o.order_number}</p>
                <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {o.customer_name} · {o.delivery_phone}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold">{formatGHC(o.subtotal)}</p>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${o.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-secondary"}`}>
                  {String(o.payment_status).toUpperCase()}
                </span>
              </div>
            </div>
            <p className="text-xs mt-2 text-foreground/80 line-clamp-1">
              {o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
            </p>
            <div className="flex items-center justify-between mt-2">
              <div className="flex gap-1 flex-wrap">
                {statuses.map((s) => (
                  <span key={s} className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${FSTYLE[s] ?? ""}`}>{s}</span>
                ))}
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
