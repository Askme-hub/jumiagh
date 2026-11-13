import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import {
  Search,
  Minus,
  Plus,
  Trash2,
  Loader2,
  Printer,
  MessageCircle,
  Receipt,
  X,
  ShoppingCart,
  Banknote,
  ScanBarcode,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatGHC } from "@/lib/store";
import { toast } from "sonner";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  image_url: string | null;
  category: string | null;
  approval_status?: string | null;
  barcode?: string | null;
};
type Line = { product_id: string; name: string; price: number; qty: number };
type Sale = {
  id: string;
  receipt_number: string;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string;
  customer_name: string | null;
  customer_phone: string | null;
  items: Line[];
  created_at: string;
};

const PAY_LABEL: Record<string, string> = {
  cash: "Cash",
  momo: "MoMo",
  card: "Card",
};

export function PosSell() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [inStockOnly, setInStockOnly] = useState(true);
  const [cart, setCart] = useState<Record<string, Line>>({});
  const [pay, setPay] = useState<"cash" | "momo" | "card">("cash");
  const [discount, setDiscount] = useState("");
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [cashTendered, setCashTendered] = useState("");
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const scanBuffer = useRef("");
  const scanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const { data: shop } = useQuery({
    queryKey: ["pos-shop", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("seller_profiles")
        .select("shop_name, phone, whatsapp_number, location, slug, logo_url")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["pos-products", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, stock, image_url, category, approval_status, barcode")
        .eq("seller_id", user!.id)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["pos-sales", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pos_sales")
        .select("*")
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as unknown as Sale[];
    },
  });

  const sellable = useMemo(
    () =>
      products.filter(
        (p) => !p.approval_status || p.approval_status === "approved"
      ),
    [products]
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    sellable.forEach((p) => {
      if (p.category?.trim()) set.add(p.category.trim());
    });
    return ["all", ...Array.from(set).sort()];
  }, [sellable]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return sellable.filter((p) => {
      if (inStockOnly && p.stock <= 0) return false;
      if (category !== "all" && (p.category ?? "").trim() !== category) return false;
      if (!s) return true;
      return (
        p.name.toLowerCase().includes(s) ||
        (p.category ?? "").toLowerCase().includes(s)
      );
    });
  }, [sellable, q, category, inStockOnly]);

  const lines = Object.values(cart);
  const itemCount = lines.reduce((a, l) => a + l.qty, 0);
  const subtotal = lines.reduce((a, l) => a + l.price * l.qty, 0);
  const disc = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const total = subtotal - disc;
  const tendered = Number(cashTendered) || 0;
  const change = pay === "cash" && tendered > 0 ? Math.max(0, tendered - total) : 0;

  const todaySales = sales.filter(
    (s) => new Date(s.created_at).toDateString() === new Date().toDateString()
  );
  const todayTotal = todaySales.reduce((a, s) => a + Number(s.total), 0);

  const add = (p: Product, silent = false) => {
    if (p.stock <= 0) {
      if (!silent) toast.error("Out of stock");
      return false;
    }
    setCart((prev) => {
      const cur = prev[p.id]?.qty ?? 0;
      if (cur >= p.stock) {
        toast.error(`Only ${p.stock} in stock`);
        return prev;
      }
      return {
        ...prev,
        [p.id]: {
          product_id: p.id,
          name: p.name,
          price: Number(p.price),
          qty: cur + 1,
        },
      };
    });
    if (!silent) toast.success(`${p.name} added`, { duration: 1200 });
    return true;
  };

  const findByCode = (code: string) => {
    const c = code.trim().toLowerCase();
    if (!c) return null;
    return (
      sellable.find((p) => (p.barcode ?? "").trim().toLowerCase() === c) ||
      sellable.find((p) => p.id.toLowerCase() === c) ||
      null
    );
  };

  /** Handle a scanned / typed barcode: match product and add to cart */
  const handleScanCode = (code: string) => {
    const raw = code.trim();
    if (!raw) return;
    const p = findByCode(raw);
    if (!p) {
      toast.error(`No product for barcode "${raw}"`);
      setQ(raw);
      return;
    }
    add(p);
    setQ("");
  };

  const setQty = (id: string, qty: number) => {
    const p = products.find((x) => x.id === id);
    if (p && qty > p.stock) return toast.error(`Only ${p.stock} in stock`);
    const next = { ...cart };
    if (qty <= 0) delete next[id];
    else next[id] = { ...next[id], qty };
    setCart(next);
  };

  // USB / Bluetooth scanners act as a keyboard: rapid keystrokes + Enter
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (scanOpen || receipt) return;
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput =
        tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      // When focused in search box, Enter is handled by the input onKeyDown
      if (isInput && document.activeElement === searchRef.current) return;
      // Ignore shortcuts with modifiers
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "Enter") {
        if (scanBuffer.current.length >= 3) {
          e.preventDefault();
          handleScanCode(scanBuffer.current);
          scanBuffer.current = "";
        }
        return;
      }
      if (e.key.length === 1) {
        scanBuffer.current += e.key;
        if (scanTimer.current) clearTimeout(scanTimer.current);
        scanTimer.current = setTimeout(() => {
          scanBuffer.current = "";
        }, 80);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (scanTimer.current) clearTimeout(scanTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellable, scanOpen, receipt, cart]);

  const clearCart = () => {
    setCart({});
    setDiscount("");
    setCashTendered("");
    setCustName("");
    setCustPhone("");
  };

  const checkout = useMutation({
    mutationFn: async () => {
      if (!lines.length) throw new Error("Cart is empty");
      const { data: id, error } = await supabase.rpc("record_pos_sale", {
        _items: lines.map((l) => ({ product_id: l.product_id, qty: l.qty })),
        _payment_method: pay,
        _discount: disc,
        _customer_name: custName || undefined,
        _customer_phone: custPhone || undefined,
      });
      if (error) throw error;
      const { data } = await supabase
        .from("pos_sales")
        .select("*")
        .eq("id", id as string)
        .single();
      return data as unknown as Sale;
    },
    onSuccess: (sale) => {
      toast.success("Sale recorded — stock updated");
      clearCart();
      setCartOpen(false);
      setReceipt(sale);
      qc.invalidateQueries({ queryKey: ["pos-products"] });
      qc.invalidateQueries({ queryKey: ["pos-sales"] });
      qc.invalidateQueries({ queryKey: ["seller-products-summary"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cartPanel = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h2 className="font-bold">Current sale</h2>
          <p className="text-xs text-muted-foreground">
            {itemCount === 0
              ? "No items yet"
              : `${itemCount} item${itemCount === 1 ? "" : "s"}`}
          </p>
        </div>
        {lines.length > 0 && (
          <button
            type="button"
            onClick={clearCart}
            className="text-xs font-semibold text-destructive"
          >
            Clear
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-3">
        {lines.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Tap products to add them to the cart.
          </p>
        ) : (
          <ul className="space-y-3">
            {lines.map((l) => (
              <li key={l.product_id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{l.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatGHC(l.price)} each
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setQty(l.product_id, l.qty - 1)}
                    className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-background"
                    aria-label="Decrease"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-7 text-center text-sm font-bold">{l.qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty(l.product_id, l.qty + 1)}
                    className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-background"
                    aria-label="Increase"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setQty(l.product_id, 0)}
                    className="grid h-9 w-9 place-items-center rounded-xl text-destructive"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="w-16 shrink-0 text-right text-sm font-bold">
                  {formatGHC(l.price * l.qty)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 border-t border-border pt-3">
        <div className="grid grid-cols-3 gap-2">
          {(["cash", "momo", "card"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setPay(m)}
              className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition ${
                pay === m
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background"
              }`}
            >
              {PAY_LABEL[m]}
            </button>
          ))}
        </div>

        <input
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          inputMode="decimal"
          placeholder="Discount (GH₵)"
          className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
        />

        {pay === "cash" && (
          <div className="space-y-1.5">
            <div className="relative">
              <Banknote className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={cashTendered}
                onChange={(e) => setCashTendered(e.target.value)}
                inputMode="decimal"
                placeholder="Cash received (optional)"
                className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-3 text-sm"
              />
            </div>
            {tendered > 0 && (
              <p className="text-xs font-semibold text-success-ink">
                Change: {formatGHC(change)}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <input
            value={custName}
            onChange={(e) => setCustName(e.target.value)}
            placeholder="Customer name"
            className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
          />
          <input
            value={custPhone}
            onChange={(e) => setCustPhone(e.target.value)}
            inputMode="tel"
            placeholder="Phone"
            className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
          />
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatGHC(subtotal)}</span>
          </div>
          {disc > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Discount</span>
              <span>-{formatGHC(disc)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-primary">{formatGHC(total)}</span>
          </div>
        </div>

        <button
          type="button"
          disabled={!lines.length || checkout.isPending}
          onClick={() => checkout.mutate()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {checkout.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Receipt className="h-4 w-4" />
          )}
          Complete sale · {formatGHC(total)}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 p-4 pb-28 md:p-6 lg:pb-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight">Ring up a sale</h2>
          <p className="text-sm text-muted-foreground">
            No commission · stock updates instantly
          </p>
        </div>
        <div className="flex gap-2">
          <div className="rounded-2xl border border-border bg-card px-4 py-2 text-right">
            <p className="text-[11px] text-muted-foreground">Today</p>
            <p className="font-display text-lg font-bold text-primary">
              {formatGHC(todayTotal)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {todaySales.length} sale{todaySales.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Products */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const code = q.trim();
                  if (!code) return;
                  const byCode = findByCode(code);
                  if (byCode) {
                    handleScanCode(code);
                  }
                  // else keep text filter active
                }
              }}
              placeholder="Search or scan barcode…"
              className="w-full rounded-2xl border border-input bg-background py-3 pl-10 pr-12 text-sm"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setScanOpen(true)}
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-primary hover:bg-primary/10"
              aria-label="Scan barcode with camera"
              title="Camera barcode scan"
            >
              <ScanBarcode className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setInStockOnly((v) => !v)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                inStockOnly
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              In stock only
            </button>
            <div className="flex max-w-full gap-1.5 overflow-x-auto scrollbar-none">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    category === c
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {c === "all" ? "All" : c}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading products…</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No products match. Try another search or turn off “In stock only”.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => {
                const inCart = cart[p.id]?.qty ?? 0;
                const out = p.stock <= 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => add(p)}
                    disabled={out}
                    className="relative overflow-hidden rounded-2xl border border-border bg-card text-left transition active:scale-[0.98] hover:border-primary disabled:opacity-45"
                  >
                    {inCart > 0 && (
                      <span className="absolute right-2 top-2 z-10 grid h-6 min-w-6 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                        {inCart}
                      </span>
                    )}
                    <div className="aspect-square bg-muted">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-xs text-muted-foreground">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug">{p.name}</p>
                      <p className="mt-1 font-bold text-primary">{formatGHC(Number(p.price))}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {out ? "Out of stock" : `${p.stock} left`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Desktop cart */}
        <div className="hidden h-fit rounded-2xl border border-border bg-card p-4 lg:sticky lg:top-4 lg:block">
          {cartPanel}
        </div>
      </div>

      {/* Recent sales */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">Recent walk-in sales</h2>
          <span className="text-xs text-muted-foreground">{sales.length} shown</span>
        </div>
        {sales.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No sales yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {sales.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setReceipt(s)}
                className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm transition hover:text-primary"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{s.receipt_number}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleString()} · {PAY_LABEL[s.payment_method]}
                    {s.customer_name ? ` · ${s.customer_name}` : ""}
                  </p>
                </div>
                <p className="shrink-0 font-bold">{formatGHC(Number(s.total))}</p>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Mobile sticky cart bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="flex w-full items-center justify-between gap-3 rounded-2xl bg-primary px-4 py-3.5 text-primary-foreground shadow-lg"
        >
          <span className="inline-flex items-center gap-2 font-bold">
            <ShoppingCart className="h-5 w-5" />
            Cart · {itemCount}
          </span>
          <span className="font-display text-lg font-bold">{formatGHC(total)}</span>
        </button>
      </div>

      {/* Mobile cart sheet */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/40"
            aria-label="Close cart"
            onClick={() => setCartOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-3xl bg-card p-4 pb-8 shadow-2xl">
            <div className="mb-2 flex justify-center">
              <span className="h-1.5 w-10 rounded-full bg-muted" />
            </div>
            <div className="mb-2 flex justify-end">
              <button type="button" onClick={() => setCartOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            {cartPanel}
          </div>
        </div>
      )}

      {scanOpen && (
        <BarcodeScanner
          onDetected={(code) => {
            setScanOpen(false);
            handleScanCode(code);
          }}
          onClose={() => setScanOpen(false)}
        />
      )}

      {receipt && (
        <ReceiptDialog sale={receipt} shop={shop ?? null} onClose={() => setReceipt(null)} />
      )}
    </div>
  );
}

type Shop = {
  shop_name: string;
  phone: string | null;
  whatsapp_number: string | null;
  location: string | null;
  slug: string | null;
  logo_url: string | null;
} | null;

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

function ReceiptDialog({
  sale,
  shop,
  onClose,
}: {
  sale: Sale;
  shop: Shop;
  onClose: () => void;
}) {
  const storeUrl = shop?.slug
    ? `https://kivoragh.shop/shop/${shop.slug}`
    : "https://kivoragh.shop";
  const { data: qr } = useQuery({
    queryKey: ["qr", storeUrl],
    queryFn: () => QRCode.toDataURL(storeUrl, { margin: 1, width: 240 }),
  });
  const date = new Date(sale.created_at).toLocaleString();

  const print = (width: "80mm" | "148mm") => {
    const w = window.open("", "_blank", "width=420,height=700");
    if (!w) return toast.error("Allow pop-ups to print");
    const rows = sale.items
      .map(
        (i) =>
          `<tr><td>${esc(i.name)}<br><small>${i.qty} × ${formatGHC(Number(i.price))}</small></td><td style="text-align:right">${formatGHC(Number(i.price) * i.qty)}</td></tr>`
      )
      .join("");
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
    const lines = sale.items
      .map((i) => `• ${i.name} x${i.qty} — ${formatGHC(Number(i.price) * i.qty)}`)
      .join("\n");
    const text = `*${shop?.shop_name ?? "Kivora Seller"}* — Official Receipt\n${sale.receipt_number}\n${date}\n\n${lines}\n\n${Number(sale.discount) > 0 ? `Discount: -${formatGHC(Number(sale.discount))}\n` : ""}*Total: ${formatGHC(Number(sale.total))}*\nPaid by ${PAY_LABEL[sale.payment_method]}\n\nRe-order anytime: ${storeUrl}\nThank you!`;
    const digits = (sale.customer_phone ?? "").replace(/\D/g, "");
    const to = digits.startsWith("0") ? `233${digits.slice(1)}` : digits;
    window.open(`https://wa.me/${to}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-card p-5 text-card-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">
              Official receipt
            </div>
            <div className="text-lg font-bold">{shop?.shop_name}</div>
            <div className="text-xs text-muted-foreground">
              {sale.receipt_number} · {date}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="my-4 space-y-1.5 border-y border-dashed border-border py-3 text-sm">
          {sale.items.map((i) => (
            <li key={i.product_id} className="flex justify-between gap-2">
              <span>
                {i.name} × {i.qty}
              </span>
              <span>{formatGHC(Number(i.price) * i.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatGHC(Number(sale.subtotal))}</span>
          </div>
          {Number(sale.discount) > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Discount</span>
              <span>-{formatGHC(Number(sale.discount))}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span className="text-primary">{formatGHC(Number(sale.total))}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Paid by</span>
            <span>{PAY_LABEL[sale.payment_method]}</span>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => print("80mm")}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-sm font-semibold"
          >
            <Printer className="h-4 w-4" /> 80mm
          </button>
          <button
            type="button"
            onClick={() => print("148mm")}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-sm font-semibold"
          >
            <Printer className="h-4 w-4" /> A5
          </button>
          <button
            type="button"
            onClick={whatsapp}
            className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] py-2.5 text-sm font-semibold text-white"
          >
            <MessageCircle className="h-4 w-4" /> Send on WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}


function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const stopped = useRef(false);

  useEffect(() => {
    stopped.current = false;
    let stream: MediaStream | null = null;
    let raf = 0;
    let detector: { detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>> } | null = null;

    const start = async () => {
      try {
        // Prefer native BarcodeDetector (Chrome / Android / Edge)
        const BD = (window as any).BarcodeDetector;
        if (BD) {
          try {
            detector = new BD({
              formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code", "itf"],
            });
          } catch {
            detector = new BD();
          }
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (stopped.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        if (!detector) {
          setErr("Camera is on. This browser cannot auto-read barcodes — type the code below, or use a USB scanner.");
          return;
        }

        const tick = async () => {
          if (stopped.current || !video || video.readyState < 2) {
            raf = requestAnimationFrame(tick);
            return;
          }
          try {
            const codes = await detector!.detect(video);
            if (codes?.length) {
              const value = codes[0].rawValue?.trim();
              if (value) {
                onDetected(value);
                return;
              }
            }
          } catch {
            // ignore frame errors
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch (e: any) {
        setErr(e?.message ?? "Could not open camera. Allow camera access or type the barcode.");
      }
    };

    start();
    return () => {
      stopped.current = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/90">
      <div className="flex items-center justify-between p-4 text-white">
        <div>
          <p className="font-bold">Scan barcode</p>
          <p className="text-xs opacity-70">Point at EAN, UPC, Code 128 or QR</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-full bg-white/10 p-2" aria-label="Close scanner">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="relative mx-4 flex-1 overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-40 w-[80%] max-w-sm rounded-xl border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
      </div>
      {err && <p className="px-4 pt-3 text-center text-xs text-amber-200">{err}</p>}
      <form
        className="flex gap-2 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) onDetected(manual.trim());
        }}
      >
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Or type barcode and press Go"
          className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/50"
          autoComplete="off"
        />
        <button type="submit" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
          Go
        </button>
      </form>
    </div>
  );
}

