import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Printer, Truck, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { getSellerOrder, updateItemFulfillment } from "@/lib/seller-orders.functions";
import { formatGHC } from "@/lib/store";

export const Route = createFileRoute("/seller/orders/$id")({ component: SellerOrderDetail });

const STEPS = [
  { key: "processing", label: "Processing", icon: Clock },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
] as const;

const STATUS_RANK: Record<string, number> = {
  pending: 0,
  processing: 0,
  shipped: 1,
  delivered: 2,
};

function SellerOrderDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const fetchOrder = useServerFn(getSellerOrder);
  const updateFn = useServerFn(updateItemFulfillment);

  const [rider, setRider] = useState({ name: "", phone: "", note: "" });
  const { data: order, isLoading } = useQuery({
    queryKey: ["seller-order", id],
    queryFn: () => fetchOrder({ data: { orderId: id } }),
  });

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  if (!order) return <p className="p-6 text-sm">Order not found.</p>;

  const setStatus = async (status: "processing" | "shipped" | "delivered") => {
    try {
      await updateFn({
        data: {
          itemIds: order.items.map((i) => i.id),
          status,
          ...(status === "shipped"
            ? { rider_name: rider.name, rider_phone: rider.phone, tracking_note: rider.note }
            : {}),
        },
      });
      toast.success(`Items marked as ${status}`);
      qc.invalidateQueries({ queryKey: ["seller-order", id] });
      qc.invalidateQueries({ queryKey: ["seller-orders"] });
    } catch (e: any) {
      toast.error(e.message ?? "Update failed");
    }
  };

  const currentStatus = order.items[0]?.fulfillment_status ?? "processing";

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <Link to="/seller/orders" className="flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft size={18} /> Back to orders
        </Link>
        <Link
          to="/seller/orders/$id/slip"
          params={{ id }}
          className="flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-bold"
        >
          <Printer size={16} /> Parcel slip
        </Link>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-lg font-bold">Order #{order.order_number}</h1>
            <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
          </div>
          <span
            className={`text-xs font-bold px-2 py-1 rounded ${
              order.payment_status === "paid"
                ? "bg-success-soft text-success-ink"
                : "bg-secondary"
            }`}
          >
            {String(order.payment_status).toUpperCase()}
          </span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="font-bold text-sm mb-2">Customer & Delivery</h2>
        <dl className="text-sm space-y-1">
          <Row label="Name" value={order.customer_name} />
          <Row label="Phone" value={order.delivery_phone} />
          <Row label="Email" value={order.customer_email} />
          <Row
            label="Method"
            value={
              order.delivery_type === "pickup"
                ? `Pickup — ${order.pickup_station ?? ""}`
                : "Door delivery"
            }
          />
          <Row
            label="Address"
            value={[order.delivery_address, order.delivery_city, order.delivery_region]
              .filter(Boolean)
              .join(", ")}
          />
          {order.delivery_notes && <Row label="Notes" value={order.delivery_notes} />}
        </dl>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="font-bold text-sm mb-3">Your Items</h2>
        <div className="space-y-3">
          {order.items.map((i) => (
            <div key={i.id} className="flex gap-3 items-center">
              <div className="w-12 h-12 bg-muted rounded shrink-0">
                {i.image_url && (
                  <img src={i.image_url} alt="" className="w-full h-full object-contain" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{i.name}</p>
                <p className="text-xs text-muted-foreground">
                  Qty {i.qty} · {i.fulfillment_status}
                </p>
              </div>
              <p className="font-bold text-sm">{formatGHC(i.price * i.qty)}</p>
            </div>
          ))}
        </div>
        <div className="flex justify-between border-t border-border mt-3 pt-3 font-bold">
          <span>Subtotal (your items)</span>
          <span>{formatGHC(order.subtotal)}</span>
        </div>
      </div>

      {/* Fulfillment — forward only; shipped/delivered cannot be undone by seller */}
      <div className="bg-card border border-border rounded-xl p-4 print:hidden">
        <h2 className="font-bold text-sm mb-1">Fulfillment status</h2>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Status only moves forward. Once marked shipped or delivered, it cannot be undone —
          contact admin for corrections.
        </p>
        {order.status === "cancelled" ? (
          <div className="rounded-lg bg-destructive/10 text-destructive p-3 text-sm">
            <p className="font-bold">This order was cancelled — do not ship it.</p>
            <p className="text-xs mt-1">
              It's locked. If it was cancelled by mistake, contact Kivora admin to restore it.
            </p>
          </div>
        ) : (
          <>
            {STATUS_RANK[currentStatus] === 0 && (
              <div className="mb-3 grid gap-2 sm:grid-cols-2">
                <p className="sm:col-span-2 text-xs text-muted-foreground">
                  Dispatch details (shared with the customer when you mark as shipped)
                </p>
                <input
                  value={rider.name}
                  onChange={(e) => setRider({ ...rider, name: e.target.value })}
                  placeholder="Rider / courier name"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <input
                  value={rider.phone}
                  onChange={(e) => setRider({ ...rider, phone: e.target.value })}
                  placeholder="Rider phone e.g. 024…"
                  inputMode="tel"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <input
                  value={rider.note}
                  onChange={(e) => setRider({ ...rider, note: e.target.value })}
                  placeholder="Tracking note (e.g. VIP waybill no.)"
                  className="sm:col-span-2 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              {STEPS.map(({ key, label, icon: Icon }) => {
                const stepRank = STATUS_RANK[key] ?? 0;
                const curRank = STATUS_RANK[currentStatus] ?? 0;
                const isDone = stepRank < curRank || (stepRank === curRank && key === currentStatus);
                const isCurrent = key === currentStatus || (curRank === 0 && key === "processing");
                const isNext = stepRank === curRank + 1;
                const locked = stepRank <= curRank;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={locked || order.status === "cancelled"}
                    onClick={() => {
                      if (!isNext) return;
                      setStatus(key as "processing" | "shipped" | "delivered");
                    }}
                    className={`flex flex-col items-center gap-1 py-3 rounded-lg border text-xs font-semibold transition-colors ${
                      isCurrent
                        ? "border-primary bg-primary text-primary-foreground"
                        : isDone
                          ? "border-success/40 bg-success/10 text-success-ink opacity-90"
                          : isNext
                            ? "border-border text-foreground hover:border-primary hover:bg-primary/5"
                            : "border-border text-muted-foreground opacity-50 cursor-not-allowed"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <Icon size={18} />
                    {isDone && !isCurrent ? `✓ ${label}` : isNext ? `Mark ${label}` : label}
                  </button>
                );
              })}
            </div>
            {currentStatus === "delivered" && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Delivered — locked. Contact admin if this needs changing.
              </p>
            )}
            {currentStatus === "shipped" && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Shipped — you can still mark delivered. Shipping cannot be undone.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground w-20 shrink-0">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}
