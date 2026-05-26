import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Circle,
  Clock,
  Package,
  Truck,
  Home,
  Store,
  CreditCard,
  Ban,
  ChevronLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/orders/status/$id")({
  component: ItemStatus,
  head: () => ({ meta: [{ title: "Order Status History – Jumia Ghana" }] }),
});

const LABELS: Record<string, string> = {
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
  pending_payment: "Payment is pending. Please complete payment to proceed.",
  placed: "Your order has been received and is being processed.",
  pending_confirmation: "We are verifying your order details and stock availability.",
  waiting_to_be_shipped: "Your package is being prepared and packed for shipment.",
  shipped: "Your package has left our warehouse and is on its way.",
  available_for_pickup: "Your package has arrived at the pickup station.",
  delivered: "Your package has been delivered. Enjoy your purchase!",
  cancelled: "This order was cancelled.",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending_payment: <CreditCard size={18} />,
  placed: <Package size={18} />,
  pending_confirmation: <Clock size={18} />,
  waiting_to_be_shipped: <Package size={18} />,
  shipped: <Truck size={18} />,
  available_for_pickup: <Store size={18} />,
  delivered: <Home size={18} />,
  cancelled: <Ban size={18} />,
};

function ItemStatus() {
  const { id } = Route.useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["order-history", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_status_history")
        .select("status, created_at")
        .eq("order_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Status History" />
        <div className="p-6 space-y-3">
          <div className="h-4 w-40 bg-muted rounded animate-pulse" />
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          <div className="h-4 w-48 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Status History" />
        <div className="p-6 text-center">
          <p className="text-sm text-destructive font-medium">Failed to load order status history.</p>
          <p className="text-xs text-muted-foreground mt-1">Please try again later.</p>
        </div>
      </div>
    );
  }

  const history = data ?? [];

  return (
    <div className="pb-8">
      <PageHeader
        title="Status History"
        backTo="/orders"
      />

      {/* Summary card at top */}
      <div className="px-4 py-4 bg-card border-b border-border">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Order ID</p>
        <p className="text-sm font-mono font-semibold mt-0.5">{id.slice(0, 8)}...</p>
        <p className="text-xs text-muted-foreground mt-2">{history.length} status update{history.length !== 1 ? "s" : ""} tracked</p>
      </div>

      <div className="px-4 py-4">
        {history.length === 0 ? (
          <div className="text-center py-8">
            <Clock size={40} className="text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No status updates yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Check back later for updates on your order.</p>
          </div>
        ) : (
          <ol className="relative">
            {history.map((h, i) => {
              const isLast = i === history.length - 1;
              const isFirst = i === 0;
              const isDelivered = h.status === "delivered";
              const isCancelled = h.status === "cancelled";

              return (
                <li key={i} className="flex gap-4 relative">
                  {/* Timeline column */}
                  <div className="flex flex-col items-center shrink-0">
                    {/* Top connector */}
                    {!isFirst && (
                      <div className="w-0.5 h-3 bg-border" />
                    )}

                    {/* Icon */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                        isDelivered
                          ? "border-success bg-success text-white"
                          : isCancelled
                          ? "border-destructive bg-destructive text-white"
                          : isLast
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-success bg-success text-white"
                      }`}
                    >
                      {isDelivered || isCancelled ? (
                        STATUS_ICONS[h.status]
                      ) : (
                        <CheckCircle2 size={18} strokeWidth={2.5} />
                      )}
                    </div>

                    {/* Bottom connector */}
                    {!isLast && (
                      <div className="w-0.5 flex-1 bg-border mt-1" style={{ minHeight: 24 }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className={`pb-6 ${isLast ? "pb-0" : ""}`}>
                    <span
                      className={`inline-block px-2.5 py-1 text-xs font-bold rounded-full ${
                        isDelivered
                          ? "bg-success/10 text-success"
                          : isCancelled
                          ? "bg-destructive/10 text-destructive"
                          : isLast
                          ? "bg-primary-soft text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {LABELS[h.status] ?? h.status.toUpperCase()}
                    </span>

                    <p className="text-sm text-foreground mt-1.5 font-medium">
                      {STATUS_DESCRIPTIONS[h.status] ?? "Status updated."}
                    </p>

                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(h.created_at).toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      at{" "}
                      {new Date(h.created_at).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Back link */}
      <div className="px-4 mt-2">
        <Link
          to="/orders/$id"
          params={{ id }}
          className="inline-flex items-center gap-1 text-sm text-primary font-semibold"
        >
          <ChevronLeft size={16} /> Back to Order Details
        </Link>
      </div>
    </div>
  );
}
