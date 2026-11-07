import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { ArrowLeft, Printer } from "lucide-react";
import { getSellerOrder } from "@/lib/seller-orders.functions";
import { code128Svg } from "@/lib/barcode128";
import { formatGHC } from "@/lib/store";

export const Route = createFileRoute("/seller/orders/$id/slip")({
  head: () => ({ meta: [{ title: "Parcel slip — Kivora Seller Hub" }, { name: "robots", content: "noindex" }] }),
  component: ParcelSlip,
});

function ParcelSlip() {
  const { id } = Route.useParams();
  const fetchOrder = useServerFn(getSellerOrder);
  const { data: o, isLoading } = useQuery({ queryKey: ["seller-order", id], queryFn: () => fetchOrder({ data: { orderId: id } }) });
  const [qr, setQr] = useState("");

  useEffect(() => {
    if (!o) return;
    QRCode.toDataURL(`https://kivoragh.shop/orders/${o.id}`, { margin: 0, width: 240 }).then(setQr);
  }, [o]);

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  if (!o) return <p className="p-6 text-sm">Order not found.</p>;

  const cod = o.payment_method === "cod";
  const collect = o.sole_seller ? o.order_total : o.subtotal;
  const units = o.items.reduce((a, i) => a + i.qty, 0);

  return (
    <div className="p-4 max-w-2xl mx-auto print:p-0 print:max-w-none">
      <style>{`@media print { @page { size: A5; margin: 8mm; } body * { visibility: hidden; } #slip, #slip * { visibility: visible; } #slip { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Link to="/seller/orders/$id" params={{ id }} className="flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft size={18} /> Back</Link>
        <button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-bold"><Printer size={16} /> Print slip</button>
      </div>

      {/* Slip is intentionally black-on-white for printing, regardless of theme */}
      <div id="slip" style={{ background: "#fff", color: "#000" }} className="border-2 border-dashed border-current rounded-lg p-4 font-sans text-[13px] leading-snug">
        <div className="flex items-start justify-between border-b-2 border-current pb-2">
          <div>
            <p className="text-2xl font-black tracking-tight">KIVORA<span style={{ color: "#F97316" }}>.</span></p>
            <p className="text-[10px] font-bold uppercase tracking-widest">Parcel slip · Ghana</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold">From</p>
            <p className="font-bold">{o.shop?.shop_name ?? "Kivora seller"}</p>
            <p className="text-[11px]">{[o.shop?.location, o.shop?.store_region].filter(Boolean).join(", ")}</p>
            {o.shop?.phone && <p className="text-[11px]">{o.shop.phone}</p>}
          </div>
        </div>

        <div className="mt-3 flex gap-3 items-center">
          <div className="flex-1 min-w-0">
            <div dangerouslySetInnerHTML={{ __html: code128Svg(o.order_number, 64) }} />
            <p className="text-center font-mono font-bold tracking-[0.3em] mt-1">{o.order_number}</p>
          </div>
          {qr && <img src={qr} alt="Order QR code" className="w-24 h-24 shrink-0" />}
        </div>

        <div className="mt-3 border-2 border-current rounded p-2 text-center" style={cod ? { background: "#000", color: "#fff" } : {}}>
          {cod ? (
            <>
              <p className="text-[11px] font-bold uppercase tracking-widest">Pay on delivery</p>
              <p className="text-2xl font-black">COLLECT {formatGHC(collect)}</p>
            </>
          ) : (
            <>
              <p className="text-lg font-black">PAID ONLINE</p>
              <p className="text-[11px] font-bold uppercase">Do not collect cash</p>
            </>
          )}
        </div>

        <div className="mt-3 border-2 border-current rounded p-2">
          <p className="text-[10px] uppercase font-bold">Deliver to</p>
          <p className="text-lg font-black">{o.delivery_name ?? o.customer_name}</p>
          <p className="font-bold">{o.delivery_phone}</p>
          {o.delivery_type === "pickup" ? (
            <p className="font-bold">PICKUP: {o.pickup_station}</p>
          ) : (
            <p>{o.delivery_address}</p>
          )}
          <p className="font-bold uppercase">{[o.delivery_city, o.delivery_region].filter(Boolean).join(" · ")}</p>
          {o.delivery_notes && <p className="italic text-[11px] mt-1">Note: {o.delivery_notes}</p>}
        </div>

        <table className="w-full mt-3 text-[12px]">
          <thead><tr className="border-b border-current text-left"><th className="py-1">Item</th><th className="text-center">Qty</th><th className="text-right">Amount</th></tr></thead>
          <tbody>
            {o.items.map((i) => (
              <tr key={i.id} className="border-b border-dotted border-current"><td className="py-1 pr-2">{i.name}</td><td className="text-center">{i.qty}</td><td className="text-right">{formatGHC(i.price * i.qty)}</td></tr>
            ))}
          </tbody>
          <tfoot><tr className="font-bold"><td className="py-1">{units} unit(s)</td><td /><td className="text-right">{formatGHC(o.subtotal)}</td></tr></tfoot>
        </table>

        <div className="mt-4 grid grid-cols-2 gap-4 text-[11px]">
          <div><p>Dispatched by / date</p><div className="border-b border-current h-6" /></div>
          <div><p>Received by (signature)</p><div className="border-b border-current h-6" /></div>
        </div>
        <p className="mt-3 text-center text-[10px]">Ordered {new Date(o.created_at).toLocaleDateString()} · Scan QR to track · kivoragh.shop · Help: 0257573471</p>
      </div>
    </div>
  );
}
