import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { Search, Minus, Plus, Trash2, Loader2, Printer, MessageCircle, Receipt, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatGHC } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/seller/pos")({
  component: SellerPOS,
  head: () => ({ meta: [
    { title: "Point of Sale — Kivora Seller Hub" },
    { name: "description", content: "Ring up walk-in sales and issue official Kivora receipts." },
    { name: "robots", content: "noindex" },
  ] }),
});

type Product = { id: string; name: string; price: number; stock: number; image_url: string | null; category: string | null };
type Line = { product_id: string; name: string; price: number; qty: number };
type Sale = {
  id: string; receipt_number: string; subtotal: number; discount: number; total: number;
  payment_method: string; customer_name: string | null; customer_phone: string | null;
  items: Line[]; created_at: string;
};

const PAY_LABEL: Record<string, string> = { cash: "Cash", momo: "Mobile Money", card: "Card" };

function SellerPOS() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Record<string, Line>>({});
  const [pay, setPay] = useState<"cash" | "momo" | "card">("cash");
  const [discount, setDiscount] = useState("");
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [receipt, setReceipt] = useState<Sale | null>(null);

  const { data: shop } = useQuery({
    queryKey: ["pos-shop", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("seller_profiles")
        .select("shop_name, phone, whatsapp_number, location, slug, logo_url").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["pos-products", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("products")
        .select("id, name, price, stock, image_url, category").eq("seller_id", user!.id).order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["pos-sales", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("pos_sales").select("*")
        .eq("seller_id", user!.id).order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return data as unknown as Sale[];
    },
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? products.filter((p) => p.name.toLowerCase().includes(s) || p.category?.toLowerCase().includes(s)) : products;
  }, [products, q]);

  const lines = Object.values(cart);
  const subtotal = lines.reduce((a, l) => a + l.price * l.qty, 0);
  const disc = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const total = subtotal - disc;
  const todayTotal = sales.filter((s) => new Date(s.created_at).toDateString() === new Date().toDateString())
    .reduce((a, s) => a + Number(s.total), 0);

  const add = (p: Product) => {
    const cur = cart[p.id]?.qty ?? 0;
    if (cur >= p.stock) return toast.error(`Only ${p.stock} in stock`);
    setCart({ ...cart, [p.id]: { product_id: p.id, name: p.name, price: Number(p.price), qty: cur + 1 } });
  };
  const setQty = (id: string, qty: number) => {
    const p = products.find((x) => x.id === id);
    if (p && qty > p.stock) return toast.error(`Only ${p.stock} in stock`);
    const next = { ...cart };
    if (qty <= 0) delete next[id]; else next[id] = { ...next[id], qty };
    setCart(next);
  };

  const checkout = useMutation({
    mutationFn: async () => {
      const { data: id, error } = await supabase.rpc("record_pos_sale", {
        _items: lines.map((l) => ({ product_id: l.product_id, qty: l.qty })),
        _payment_method: pay, _discount: disc,
        _customer_name: custName || undefined, _customer_phone: custPhone || undefined,
      });
      if (error) throw error;
      const { data } = await supabase.from("pos_sales").select("*").eq("id", id as string).single();
      return data as unknown as Sale;
    },
    onSuccess: (sale) => {
      toast.success("Sale recorded — stock updated");
      setCart({}); setDiscount(""); setCustName(""); setCustPhone("");
      setReceipt(sale);
      qc.invalidateQueries({ queryKey: ["pos-products"] });
      qc.invalidateQueries({ queryKey: ["pos-sales"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Point of Sale</h1>
          <p className="text-sm text-muted-foreground">Walk-in sales · no Kivora commission · stock updates instantly</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-2 text-right">
          <div className="text-xs text-muted-foreground">Today's walk-in sales</div>
          <div className="text-lg font-bold text-primary">{formatGHC(todayTotal)}</div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your products…"
              className="w-full rounded-full border border-input bg-background py-2.5 pl-9 pr-4 text-sm" />
          </div>
          {isLoading ? <div className="p-6 text-sm text-muted-foreground">Loading…</div> :
            filtered.length === 0 ? <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No products found.</div> :
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => (
                <button key={p.id} onClick={() => add(p)} disabled={p.stock <= 0}
                  className="overflow-hidden rounded-xl border border-border bg-card text-left transition hover:border-primary disabled:opacity-50">
                  <div className="aspect-square bg-muted">
                    {p.image_url && <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover" />}
                  </div>
                  <div className="p-2.5">
                    <div className="line-clamp-2 text-sm font-medium">{p.name}</div>
                    <div className="mt-1 font-bold text-primary">{formatGHC(Number(p.price))}</div>
                    <div className="text-xs text-muted-foreground">{p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}</div>
                  </div>
                </button>
              ))}
            </div>}
        </div>

        <div className="h-fit space-y-3 rounded-2xl border border-border bg-card p-4 lg:sticky lg:top-4">
          <h2 className="font-semibold">Current sale</h2>
          {lines.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Tap products to add them.</p> :
            <ul className="space-y-2">
              {lines.map((l) => (
                <li key={l.product_id} className="flex items-center gap-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{l.name}</div>
                    <div className="text-xs text-muted-foreground">{formatGHC(l.price)} × {l.qty}</div>
                  </div>
                  <button onClick={() => setQty(l.product_id, l.qty - 1)} className="rounded-md border border-border p-1" aria-label="Less"><Minus className="h-3 w-3" /></button>
                  <span className="w-6 text-center">{l.qty}</span>
                  <button onClick={() => setQty(l.product_id, l.qty + 1)} className="rounded-md border border-border p-1" aria-label="More"><Plus className="h-3 w-3" /></button>
                  <button onClick={() => setQty(l.product_id, 0)} className="p-1 text-destructive" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>}

          <div className="grid grid-cols-3 gap-2">
            {(["cash", "momo", "card"] as const).map((m) => (
              <button key={m} onClick={() => setPay(m)}
                className={`rounded-lg border px-2 py-2 text-xs font-semibold ${pay === m ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>
                {PAY_LABEL[m]}
              </button>
            ))}
          </div>
          <input value={discount} onChange={(e) => setDiscount(e.target.value)} inputMode="decimal" placeholder="Discount (GH₵, optional)"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <input value={custName} onChange={(e) => setCustName(e.target.value)} placeholder="Customer name (optional)"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <input value={custPhone} onChange={(e) => setCustPhone(e.target.value)} inputMode="tel" placeholder="Customer phone (optional)"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />

          <div className="space-y-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatGHC(subtotal)}</span></div>
            {disc > 0 && <div className="flex justify-between text-muted-foreground"><span>Discount</span><span>-{formatGHC(disc)}</span></div>}
            <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-primary">{formatGHC(total)}</span></div>
          </div>
          <button disabled={!lines.length || checkout.isPending} onClick={() => checkout.mutate()}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50">
            {checkout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />} Complete sale
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 font-semibold">Recent walk-in sales</h2>
        {sales.length === 0 ? <p className="text-sm text-muted-foreground">No sales yet.</p> :
          <div className="divide-y divide-border">
            {sales.map((s) => (
              <button key={s.id} onClick={() => setReceipt(s)} className="flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm hover:text-primary">
                <div>
                  <div className="font-medium">{s.receipt_number}</div>
                  <div className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()} · {PAY_LABEL[s.payment_method]}{s.customer_name ? ` · ${s.customer_name}` : ""}</div>
                </div>
                <div className="font-bold">{formatGHC(Number(s.total))}</div>
              </button>
            ))}
          </div>}
      </div>

      {receipt && <ReceiptDialog sale={receipt} shop={shop ?? null} onClose={() => setReceipt(null)} />}
    </div>
  );
}

type Shop = { shop_name: string; phone: string | null; whatsapp_number: string | null; location: string | null; slug: string | null; logo_url: string | null } | null;

function esc(s: string) { return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!)); }

function ReceiptDialog({ sale, shop, onClose }: { sale: Sale; shop: Shop; onClose: () => void }) {
  const storeUrl = shop?.slug ? `https://kivoragh.shop/shop/${shop.slug}` : "https://kivoragh.shop";
  const { data: qr } = useQuery({ queryKey: ["qr", storeUrl], queryFn: () => QRCode.toDataURL(storeUrl, { margin: 1, width: 240 }) });
  const date = new Date(sale.created_at).toLocaleString();

  const print = (width: "80mm" | "148mm") => {
    const w = window.open("", "_blank", "width=420,height=700");
    if (!w) return toast.error("Allow pop-ups to print");
    const rows = sale.items.map((i) => `<tr><td>${esc(i.name)}<br><small>${i.qty} × ${formatGHC(Number(i.price))}</small></td><td style="text-align:right">${formatGHC(Number(i.price) * i.qty)}</td></tr>`).join("");
    w.document.write(`<!doctype html><html><head><title>${sale.receipt_number}</title><style>
      @page{size:${width} auto;margin:4mm}body{font-family:Arial,sans-serif;width:${width === "80mm" ? "72mm" : "136mm"};margin:0 auto;color:#111;font-size:12px}
      h1{font-size:18px;margin:0;text-align:center}.c{text-align:center}.m{color:#555;font-size:11px}table{width:100%;border-collapse:collapse}td{padding:4px 0;border-bottom:1px dashed #ccc;vertical-align:top}
      .t{display:flex;justify-content:space-between}.big{font-size:16px;font-weight:bold}hr{border:0;border-top:1px dashed #999}.brand{color:#F97316;font-weight:bold}
    </style></head><body>
      <h1>${esc(shop?.shop_name ?? "Kivora Seller")}</h1>
      <div class="c m">${esc(shop?.location ?? "")}${shop?.phone ? `<br>Tel: ${esc(shop.phone)}` : ""}</div>
      <hr><div class="c"><b>OFFICIAL RECEIPT</b><br><span class="m">${sale.receipt_number} · ${esc(date)}</span></div>
      ${sale.customer_name || sale.customer_phone ? `<div class="m">Customer: ${esc(sale.customer_name ?? "")} ${esc(sale.customer_phone ?? "")}</div>` : ""}
      <hr><table>${rows}</table>
      <div class="t" style="margin-top:6px"><span>Subtotal</span><span>${formatGHC(Number(sale.subtotal))}</span></div>
      ${Number(sale.discount) > 0 ? `<div class="t"><span>Discount</span><span>-${formatGHC(Number(sale.discount))}</span></div>` : ""}
      <div class="t big"><span>TOTAL</span><span>${formatGHC(Number(sale.total))}</span></div>
      <div class="t m"><span>Paid by</span><span>${PAY_LABEL[sale.payment_method]}</span></div>
      <hr><div class="c">${qr ? `<img src="${qr}" width="110" height="110">` : ""}<br>Re-order anytime from our online store<br><b>${esc(storeUrl.replace("https://", ""))}</b></div>
      <hr><div class="c m">Thank you for shopping with us!<br>Powered by <span class="brand">Kivora</span></div>
      <script>window.onload=()=>{setTimeout(()=>window.print(),300)}</script></body></html>`);
    w.document.close();
  };

  const whatsapp = () => {
    const lines = sale.items.map((i) => `• ${i.name} x${i.qty} — ${formatGHC(Number(i.price) * i.qty)}`).join("\n");
    const text = `*${shop?.shop_name ?? "Kivora Seller"}* — Official Receipt\n${sale.receipt_number}\n${date}\n\n${lines}\n\n${Number(sale.discount) > 0 ? `Discount: -${formatGHC(Number(sale.discount))}\n` : ""}*Total: ${formatGHC(Number(sale.total))}*\nPaid by ${PAY_LABEL[sale.payment_method]}\n\nRe-order anytime: ${storeUrl}\nThank you!`;
    const digits = (sale.customer_phone ?? "").replace(/\D/g, "");
    const to = digits.startsWith("0") ? `233${digits.slice(1)}` : digits;
    window.open(`https://wa.me/${to}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-card p-5 text-card-foreground" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">Official receipt</div>
            <div className="text-lg font-bold">{shop?.shop_name}</div>
            <div className="text-xs text-muted-foreground">{sale.receipt_number} · {date}</div>
          </div>
          <button onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <ul className="my-4 space-y-1.5 border-y border-dashed border-border py-3 text-sm">
          {sale.items.map((i) => (
            <li key={i.product_id} className="flex justify-between gap-2"><span>{i.name} × {i.qty}</span><span>{formatGHC(Number(i.price) * i.qty)}</span></li>
          ))}
        </ul>
        {Number(sale.discount) > 0 && <div className="flex justify-between text-sm text-muted-foreground"><span>Discount</span><span>-{formatGHC(Number(sale.discount))}</span></div>}
        <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-primary">{formatGHC(Number(sale.total))}</span></div>
        <div className="text-xs text-muted-foreground">Paid by {PAY_LABEL[sale.payment_method]}</div>
        {qr && <img src={qr} alt="Store QR code" className="mx-auto mt-4 h-28 w-28 rounded bg-background" />}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={() => print("80mm")} className="flex items-center justify-center gap-1.5 rounded-full border border-border py-2 text-sm font-semibold"><Printer className="h-4 w-4" /> 80mm</button>
          <button onClick={() => print("148mm")} className="flex items-center justify-center gap-1.5 rounded-full border border-border py-2 text-sm font-semibold"><Printer className="h-4 w-4" /> A5</button>
          <button onClick={whatsapp} className="col-span-2 flex items-center justify-center gap-1.5 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground"><MessageCircle className="h-4 w-4" /> Send on WhatsApp</button>
        </div>
      </div>
    </div>
  );
}
