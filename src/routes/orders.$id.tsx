import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { formatGHC, useShop } from "@/lib/store";
import {
  RefreshCw,
  MapPin,
  CheckCircle2,
  Circle,
  Clock,
  Package,
  Truck,
  Home,
  Store,
  CreditCard,
  ChevronRight,
  Ban,
} from "lucide-react";

export const Route = createFileRoute("/orders/$id")({
  component: OrderDetails,
  head: () => ({ meta: [{ title: "Order Details – Jumia Ghana" }] }),
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

const STATUS_DESCRIPTIONS: Record<string, string> = {
  pending_payment: "Complete your payment to confirm this order.",
  placed: "Your order has been received and is being processed.",
  pending_confirmation: "We are verifying your order details.",
  waiting_to_be_shipped: "Your package is being prepared for dispatch.",
  shipped: "Your package is on the way to the destination.",
  available_for_pickup: "Your package is ready for pickup at the station.",
  delivered: "Your package has been delivered successfully.",
  cancelled: "This order has been cancelled.",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending_payment: <CreditCard size={16} />,
  placed: <Package size={16} />,
  pending_confirmation: <Clock size={16} />,
  waiting_to_be_shipped: <Package size={16} />,
  shipped: <Truck size={16} />,
  available_for_pickup: <Store size={16} />,
  delivered: <Home size={16} />,
  cancelled: <Ban size={16} />,
};

function StatusBadge({ status }: { status: string }) {
  const isSuccess = status === "delivered";
  const isWarning = status === "pending_payment" || status === "pending_confirmation";
  const isDanger = status === "cancelled";
  const isInfo = !isSuccess && !isWarning && !isDanger;

  const base = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold";
  const color = isSuccess
    ? "bg-success/10 text-success"
    : isDanger
    ? "bg-destructive/10 text-destructive"
    : isWarning
    ? "bg-accent text-accent-foreground"
    : "bg-primary-soft text-primary";

  return (
    <span className={`${base} ${color}`}>
      {STATUS_ICONS[status] ?? <Circle size={14} />}
      {STATUS_NAMES[status] ?? status}
    </span>
  );
}

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

  if (isLoading)
    return (
      <div>
        <PageHeader title="Order Details" />
        <div className="p-6">
          <div className="h-4 w-32 bg-muted rounded animate-pulse mb-3" />
          <div className="h-3 w-48 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  if (!data)
    return (
      <div>
        <PageHeader title="Order Details" />
        <p className="p-6 text-sm">Order not found.</p>
      </div>
    );

  const cancelled = data.status === "cancelled";
  const currentIdx = STATUS_FLOW.indexOf(data.status);
  const history: { status: string; created_at: string }[] = (data.order_status_history ?? [])
    .slice()
    .sort((a: any, b: any) => +new Date(a.created_at) - +new Date(b.created_at));
  const historyMap = new Map(history.map((h) => [h.status, h.created_at]));

  const subtotal = Number(data.total) - Number(data.shipping_fee ?? 0) + Number(data.discount ?? 0);

  return (
    <div className="pb-8">
      <PageHeader title="Order Details" />

      {/* Order header card */}
      <div className="bg-card border-b border-border">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Order Number</p>
              <p className="text-lg font-extrabold">{data.order_number}</p>
            </div>
            <StatusBadge status={data.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            Placed on {new Date(data.created_at).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date(data.created_at).toLocaleTimeString("en-GB")}
          </p>
        </div>

        {/* Status description banner */}
        <div className={`px-4 py-3 text-sm ${cancelled ? "bg-destructive/5 text-destructive" : "bg-primary-soft/50 text-foreground"}`}>
          {STATUS_DESCRIPTIONS[data.status]}
        </div>
      </div>

      {/* Status Timeline */}
      <div className="bg-card mt-2 border-b border-border">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="font-bold text-sm">Status Timeline</span>
          <Link
            to="/orders/status/$id"
            params={{ id: data.id }}
            className="text-xs text-primary font-semibold flex items-center gap-0.5"
          >
            Full History <ChevronRight size={14} />
          </Link>
        </div>
        <div className="px-4 py-4">
          {cancelled ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/10">
              <Ban size={22} className="text-destructive shrink-0" />
              <div>
                <p className="font-bold text-sm text-destructive">Order Cancelled</p>
                <p className="text-xs text-muted-foreground mt-0.5">This order was cancelled and will not be processed.</p>
              </div>
            </div>
          ) : (
            <ol className="relative">
              {STATUS_FLOW.map((s, i) => {
                const reached = i <= currentIdx;
                const isCurrent = i === currentIdx;
                const at = historyMap.get(s);
                const isLastStep = i === STATUS_FLOW.length - 1;

                return (
                  <li key={s} className="flex gap-3 relative">
                    {/* Timeline line + icon column */}
                    <div className="flex flex-col items-center shrink-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                          isCurrent
                            ? "border-primary bg-primary text-primary-foreground"
                            : reached
                            ? "border-success bg-success text-white"
                            : "border-border bg-card text-muted-foreground"
                        }`}
                      >
                        {reached ? (
                          <CheckCircle2 size={16} strokeWidth={2.5} />
                        ) : (
                          <Circle size={16} />
                        )}
                      </div>
                      {!isLastStep && (
                        <div
                          className={`w-0.5 flex-1 mt-1 ${
                            i < currentIdx ? "bg-success" : "bg-border"
                          }`}
                          style={{ minHeight: 28 }}
                        />
                      )}
                    </div>

                    {/* Step content */}
                    <div className={`pb-5 ${isLastStep ? "" : ""}`}>
                      <p
                        className={`text-sm font-bold ${
                          reached ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {STATUS_NAMES[s]}
                      </p>
                      {at && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Clock size={11} />
                          {new Date(at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                      {isCurrent && !cancelled && (
                        <p className="text-xs text-primary mt-1 font-medium">Current step</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>

      {/* Delivery / Shipping Card */}
      <div className="bg-card mt-2 border-b border-border">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2 font-bold text-sm">
          <MapPin size={16} className="text-primary" />
          {data.delivery_type === "pickup" ? "Pickup Details" : "Shipping Details"}
        </div>
        <div className="px-4 py-4 space-y-3">
          {/* Delivery method row */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
              {data.delivery_type === "pickup" ? (
                <Store size={18} className="text-primary" />
              ) : (
                <Truck size={18} className="text-primary" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold">
                {data.delivery_type === "pickup" ? "Pickup Station" : "Door Delivery"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {data.delivery_type === "pickup"
                  ? "Collect your package at the selected station"
                  : "Your package will be delivered to your address"}
              </p>
            </div>
          </div>

          {/* Address details */}
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-foreground">{data.delivery_name}</p>
            <p className="text-muted-foreground">{data.delivery_phone}</p>
            {data.delivery_type === "pickup" && data.pickup_station && (
              <p className="font-semibold text-primary mt-1 flex items-center gap-1.5">
                <Store size={14} />
                {data.pickup_station}
              </p>
            )}
            <p className="text-muted-foreground mt-1">{data.delivery_address}</p>
            <p className="text-muted-foreground">
              {data.delivery_city}, {data.delivery_region}
            </p>
            {data.delivery_notes && (
              <p className="text-sm text-muted-foreground italic mt-2 bg-muted/40 p-2 rounded">
                Note: {data.delivery_notes}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Payment summary */}
      <div className="bg-card mt-2 border-b border-border">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2 font-bold text-sm">
          <CreditCard size={16} className="text-primary" />
          Payment Summary
        </div>
        <div className="px-4 py-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal ({data.item_count} items)</span>
            <span>{formatGHC(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping Fee</span>
            <span className={Number(data.shipping_fee ?? 0) === 0 ? "text-success font-semibold" : ""}>
              {Number(data.shipping_fee ?? 0) === 0 ? "FREE" : formatGHC(Number(data.shipping_fee))}
            </span>
          </div>
          {Number(data.discount ?? 0) > 0 && (
            <div className="flex justify-between text-success">
              <span>Discount</span>
              <span className="font-semibold">-{formatGHC(Number(data.discount))}</span>
            </div>
          )}
          <div className="pt-2 mt-2 border-t border-border flex justify-between items-center">
            <span className="font-bold">Total</span>
            <span className="font-extrabold text-lg">{formatGHC(Number(data.total))}</span>
          </div>
          <div className="pt-1 flex justify-between text-xs">
            <span className="text-muted-foreground">Payment Status</span>
            <span
              className={`font-bold ${
                data.payment_status === "paid"
                  ? "text-success"
                  : data.payment_status === "failed"
                  ? "text-destructive"
                  : "text-muted-foreground"
              }`}
            >
              {String(data.payment_status).toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Order items */}
      <div className="mt-2">
        <div className="px-4 py-3 bg-muted font-bold text-sm flex items-center gap-2">
          <Package size={16} />
          Items in this Order ({data.item_count})
        </div>

        {data.order_items?.map((it: any) => (
          <div key={it.id} className="bg-card border-b border-border">
            <div className="p-3 flex gap-3">
              <div className="w-20 h-20 bg-muted rounded-lg shrink-0 overflow-hidden">
                {it.image_url ? (
                  <img
                    src={it.image_url}
                    alt={it.name}
                    loading="lazy"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Package size={24} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-2">{it.name}</p>
                <p className="text-xs text-muted-foreground mt-1">Qty: {it.qty}</p>
                <p className="font-bold mt-1 text-sm">
                  {formatGHC(Number(it.price))}
                  {it.old_price && (
                    <span className="line-through text-muted-foreground text-xs ml-2">
                      {formatGHC(Number(it.old_price))}
                    </span>
                  )}
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
              className="w-full bg-primary text-primary-foreground font-bold py-3 flex items-center justify-center gap-2 active:opacity-90"
            >
              <RefreshCw size={16} /> Buy Again
            </button>
          </div>
        ))}
      </div>

      {/* Need help */}
      <div className="px-4 py-4 mt-2 text-center">
        <p className="text-xs text-muted-foreground">Need help with this order?</p>
        <Link
          to="/account"
          className="text-xs text-primary font-semibold mt-1 inline-block"
        >
          Contact Support
        </Link>
      </div>
    </div>
  );
}
