import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { formatGHC, useShop } from "@/lib/store";
import { RefreshCw, MapPin, CheckCircle2, Circle, Clock } from "lucide-react";

export const Route = createFileRoute("/orders/$id")({
  component: OrderDetails,
  head: () => ({ meta: [{ title: "Order Details – Jumia Ghana" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
});

const STATUS_FLOW = [
  "pending_payment",
  "placed",
  "pending_confirmation",
  "waiting_to_be_shipped",
  "shipped",
  "available_for_pickup",
  "delivered",
];

const STATUS_NAMES: Record<string, string> = {
  pending_payment: "Awaiting Payment",
  placed: "Order Placed",
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
        .select("*, order_items(*), order_status_history(status, created_at)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
  });

  if (isLoading) return <div><PageHeader title="Order Details" /><p className="p-6 text-sm text-muted-foreground">Loading…</p></div>;
  if (!data) return <div><PageHeader title="Order Details" /><p className="p-6 text-sm">Not found.</p></div>;

  const cancelled = data.status === "cancelled";
  const currentIdx = STATUS_FLOW.indexOf(data.status);
  const history: { status: string; created_at: string }[] = (data.order_status_history ?? [])
    .slice()
    .sort((a: any, b: any) => +new Date(a.created_at) - +new Date(b.created_at));
  const historyMap = new Map(history.map((h) => [h.status, h.created_at]));

  return (
    <div>
      <PageHeader title="Order Details" />

      <div className="px-4 py-3 bg-card border-b border-border">
        <p className="font-bold">Order #{data.order_number}</p>
        <p className="text-sm text-muted-foreground mt-1">Placed: {new Date(data.created_at).toLocaleString()}</p>
        <p className="text-sm text-muted-foreground">Items: {data.item_count} · Total: <span className="font-bold text-foreground">{formatGHC(Number(data.total))}</span></p>
        <p className="text-sm mt-1">
          Payment:{" "}
          <span className={`font-bold ${data.payment_status === "paid" ? "text-success" : data.payment_status === "failed" ? "text-destructive" : "text-muted-foreground"}`}>
            {String(data.payment_status).toUpperCase()}
          </span>
        </p>
      </div>

      {/* Status timeline */}
      <div className="bg-card mt-2">
        <div className="px-4 py-3 border-b border-border font-bold">Order Status</div>
        <div className="p-4">
          {cancelled ? (
            <div className="flex items-center gap-2 text-destructive font-bold">
              <Circle size={18} /> Order Cancelled
            </div>
          ) : (
            <ol className="relative">
              {STATUS_FLOW.map((s, i) => {
                const reached = i <= currentIdx;
                const isCurrent = i === currentIdx;
                const at = historyMap.get(s);
                return (
                  <li key={s} className="flex gap-3 pb-4 last:pb-0 relative">
                    <div className="flex flex-col items-center">
                      {reached ? (
                        <CheckCircle2 size={20} className={isCurrent ? "text-primary" : "text-success"} />
                      ) : (
                        <Circle size={20} className="text-muted-foreground/40" />
                      )}
                      {i < STATUS_FLOW.length - 1 && (
                        <div className={`w-0.5 flex-1 mt-1 ${i < currentIdx ? "bg-success" : "bg-border"}`} style={{ minHeight: 18 }} />
                      )}
                    </div>
                    <div className="pb-1">
                      <p className={`text-sm font-bold ${reached ? "text-foreground" : "text-muted-foreground"}`}>
                        {STATUS_NAMES[s]}
                      </p>
                      {at && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock size={11} /> {new Date(at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>

      {/* Delivery info */}
      {data.delivery_name && (
        <div className="bg-card mt-2">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2 font-bold">
            <MapPin size={16} className="text-primary" />
            {data.delivery_type === "pickup" ? "Pickup Station" : "Door Delivery Address"}
          </div>
          <div className="px-4 py-3 text-sm space-y-0.5">
            <p className="font-semibold">{data.delivery_name}</p>
            <p>{data.delivery_phone}</p>
            {data.delivery_type === "pickup" && data.pickup_station && (
              <p className="font-semibold text-primary mt-1">{data.pickup_station}</p>
            )}
            <p className="text-muted-foreground">{data.delivery_address}</p>
            <p className="text-muted-foreground">{data.delivery_city}, {data.delivery_region}</p>
            {data.delivery_notes && <p className="text-muted-foreground italic mt-1">Note: {data.delivery_notes}</p>}
          </div>
          <div className="px-4 py-3 border-t border-border text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatGHC(Number(data.total) - Number(data.shipping_fee ?? 0) + Number(data.discount ?? 0))}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{Number(data.shipping_fee ?? 0) === 0 ? "FREE" : formatGHC(Number(data.shipping_fee))}</span></div>
            {Number(data.discount ?? 0) > 0 && <div className="flex justify-between text-success font-semibold"><span>Prepaid discount</span><span>-{formatGHC(Number(data.discount))}</span></div>}
            <div className="flex justify-between font-bold pt-1 border-t border-border"><span>Total paid</span><span>{formatGHC(Number(data.total))}</span></div>
          </div>
        </div>
      )}

      <div className="px-4 py-3 bg-muted text-sm mt-2">Items in your order</div>

      {data.order_items?.map((it: any) => (
        <div key={it.id} className="bg-card border-b border-border">
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
        </div>
      ))}

      <div className="px-4 py-3">
        <Link to="/orders/$id/status" params={{ id: data.id }} className="block text-center py-3 text-primary font-bold border border-border rounded">
          See Full Status History
        </Link>
      </div>
      <div className="h-6" />
    </div>
  );
}
