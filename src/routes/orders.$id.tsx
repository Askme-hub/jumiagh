import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { formatGHC, useShop } from "@/lib/store";
import { RefreshCw } from "lucide-react";

export const Route = createFileRoute("/orders/$id")({
  component: OrderDetails,
  head: () => ({ meta: [{ title: "Order Details – Jumia Ghana" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
});

const STATUS_NAMES: Record<string, string> = {
  pending_payment: "Awaiting Payment",
  placed: "Placed",
  pending_confirmation: "Pending Confirmation",
  waiting_to_be_shipped: "Waiting to be Shipped",
  shipped: "Shipped",
  available_for_pickup: "Available for Pickup",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function OrderDetails() {
  const { id } = Route.useParams();
  const addToCart = useShop((s) => s.addToCart);

  const { data, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div><PageHeader title="Order Details" /><p className="p-6 text-sm text-muted-foreground">Loading…</p></div>;
  if (!data) return <div><PageHeader title="Order Details" /><p className="p-6 text-sm">Not found.</p></div>;

  const delivered = data.status === "delivered";

  return (
    <div>
      <PageHeader title="Order Details" />
      <div className="px-4 py-3 bg-card border-b border-border">
        <p className="font-bold">Order #{data.order_number}</p>
        <p className="text-sm text-muted-foreground mt-1">Placed on: {new Date(data.created_at).toLocaleDateString()}</p>
        <p className="text-sm text-muted-foreground">N° of items: {data.item_count}</p>
        <p className="text-sm text-muted-foreground">Total: {formatGHC(Number(data.total))}</p>
      </div>

      <div className="px-4 py-3 bg-muted text-sm">Items in your order</div>

      {data.order_items?.map((it: any) => (
        <div key={it.id} className="bg-card border-b border-border">
          <div className="px-4 pt-3">
            <span className={`text-xs font-bold px-2 py-1 rounded ${delivered ? "bg-success text-white" : "bg-secondary"}`}>
              {STATUS_NAMES[data.status]?.toUpperCase()}
            </span>
            <p className="text-sm font-semibold mt-2">On {new Date(data.created_at).toLocaleDateString()}</p>
          </div>
          <div className="p-3 flex gap-3">
            <div className="w-20 h-20 bg-muted rounded shrink-0">
              {it.image_url && <img src={it.image_url} alt="" loading="lazy" className="w-full h-full object-contain" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm line-clamp-2">{it.name}</p>
              <p className="text-xs mt-1">Qty: {it.qty}</p>
              <p className="font-bold mt-1">{formatGHC(Number(it.price))}{" "}
                {it.old_price && <span className="line-through text-muted-foreground text-xs ml-1">{formatGHC(Number(it.old_price))}</span>}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              addToCart({
                id: it.product_id ?? it.id,
                name: it.name,
                price: Number(it.price),
                image: it.image_url ?? "",
              });
            }}
            className="w-full bg-primary text-primary-foreground font-bold py-3 flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} /> Buy Again
          </button>
          <Link
            to="/orders/$id/status"
            params={{ id: data.id }}
            className="block text-center py-3 text-primary font-bold border-t border-border"
          >
            See Status History
          </Link>
        </div>
      ))}
      <div className="h-6" />
    </div>
  );
}
