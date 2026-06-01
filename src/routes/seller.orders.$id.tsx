import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Printer, Truck, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { getSellerOrder, updateItemFulfillment } from "@/lib/seller-orders.functions";
import { formatGHC } from "@/lib/store";

export const Route = createFileRoute("/seller/orders/$id")({ component: SellerOrderDetail });

const STEPS = [
  { key: "processing", label: "Processing", icon: Clock },
  { key: "shipped", label: "Mark as Shipped", icon: Truck },
  { key: "delivered", label: "Mark as Delivered", icon: CheckCircle2 },
] as const;

function SellerOrderDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const fetchOrder = useServerFn(getSellerOrder);
  const updateFn = useServerFn(updateItemFulfillment);

  const { data: order, isLoading } = useQuery({
    queryKey: ["seller-order", id],
    queryFn: () => fetchOrder({ data: { orderId: id } }),
  });

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  if (!order) return <p className="p-6 text-sm">Order not found.</p>;

  const setStatus = async (status: "processing" | "shipped" | "delivered") => {
    try {
      await updateFn({ data: { itemIds: order.items.map((i) => i.id), status } });
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
        <button onClick={() => window.print()} className="flex items-center gap-1 text-sm font-semibold text-primary">
          <Printer size={16} /> Print receipt
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-lg font-bold">Order #{order.order_number}</h1>
            <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
          </div>
          <span className={`text-xs font-bold px-2 py-1 rounded ${order.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-secondary"}`}>
            {String(order.payment_status).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Customer */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="font-bold text-sm mb-2">Customer & Delivery</h2>
        <dl className="text-sm space-y-1">
          <Row label="Name" value={order.customer_name} />
          <Row label="Phone" value={order.delivery_phone} />
          <Row label="Email" value={order.customer_email} />
          <Row label="Method" value={order.delivery_type === "pickup" ? `Pickup — ${order.pickup_station ?? ""}` : "Door delivery"} />
          <Row label="Address" value={[order.delivery_address, order.delivery_city, order.delivery_region].filter(Boolean).join(", ")} />
          {order.delivery_notes && <Row label="Notes" value={order.delivery_notes} />}
        </dl>
      </div>

      {/* Items */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="font-bold text-sm mb-3">Your Items</h2>
        <div className="space-y-3">
          {order.items.map((i) => (
            <div key={i.id} className="flex gap-3 items-center">
              <div className="w-12 h-12 bg-muted rounded shrink-0">
                {i.image_url && <img src={i.image_url} alt="" className="w-full h-full object-contain" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm line-clamp-1">{i.name}</p>
                <p className="text-xs text-muted-foreground">{i.qty} × {formatGHC(i.price)}</p>
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

      {/* Fulfillment */}
      <div className="bg-card border border-border rounded-xl p-4 print:hidden">
        <h2 className="font-bold text-sm mb-3">Fulfillment status</h2>
        <div className="grid grid-cols-3 gap-2">
          {STEPS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setStatus(key)}
              className={`flex flex-col items-center gap-1 py-3 rounded-lg border text-xs font-semibold transition-colors ${
                currentStatus === key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary"
              }`}
            >
              <Icon size={18} /> {label}
            </button>
          ))}
        </div>
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
