import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Minus, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatGHC } from "@/lib/store";

type Row = {
  id: string;
  name: string;
  price: number;
  stock: number;
  barcode: string | null;
  image_url: string | null;
  approval_status: string | null;
  category: string | null;
};

export function PosInventory() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out" | "nobarcode">("all");
  const [editId, setEditId] = useState<string | null>(null);
  const [editStock, setEditStock] = useState("");
  const [editBarcode, setEditBarcode] = useState("");

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["pos-inventory", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, stock, barcode, image_url, approval_status, category")
        .eq("seller_id", user!.id)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products.filter((p) => {
      if (filter === "low" && !(p.stock > 0 && p.stock <= 3)) return false;
      if (filter === "out" && p.stock > 0) return false;
      if (filter === "nobarcode" && (p.barcode ?? "").trim()) return false;
      if (!s) return true;
      return (
        p.name.toLowerCase().includes(s) ||
        (p.barcode ?? "").toLowerCase().includes(s) ||
        (p.category ?? "").toLowerCase().includes(s)
      );
    });
  }, [products, q, filter]);

  const stats = useMemo(() => {
    const totalSku = products.length;
    const units = products.reduce((a, p) => a + (p.stock ?? 0), 0);
    const value = products.reduce((a, p) => a + Number(p.price) * (p.stock ?? 0), 0);
    const low = products.filter((p) => p.stock > 0 && p.stock <= 3).length;
    const out = products.filter((p) => p.stock <= 0).length;
    const noCode = products.filter((p) => !(p.barcode ?? "").trim()).length;
    return { totalSku, units, value, low, out, noCode };
  }, [products]);

  const saveRow = useMutation({
    mutationFn: async ({ id, stock, barcode }: { id: string; stock: number; barcode: string }) => {
      const { error } = await supabase
        .from("products")
        .update({
          stock,
          barcode: barcode.trim() || null,
        })
        .eq("id", id)
        .eq("seller_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inventory updated");
      setEditId(null);
      qc.invalidateQueries({ queryKey: ["pos-inventory"] });
      qc.invalidateQueries({ queryKey: ["pos-products"] });
      qc.invalidateQueries({ queryKey: ["seller-products-summary"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bump = useMutation({
    mutationFn: async ({ id, delta }: { id: string; delta: number }) => {
      const p = products.find((x) => x.id === id);
      if (!p) throw new Error("Product not found");
      const next = Math.max(0, (p.stock ?? 0) + delta);
      const { error } = await supabase
        .from("products")
        .update({ stock: next })
        .eq("id", id)
        .eq("seller_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pos-inventory"] });
      qc.invalidateQueries({ queryKey: ["pos-products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEdit = (p: Row) => {
    setEditId(p.id);
    setEditStock(String(p.stock ?? 0));
    setEditBarcode(p.barcode ?? "");
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="SKUs" value={String(stats.totalSku)} />
        <Stat label="Units in stock" value={String(stats.units)} />
        <Stat label="Stock value" value={formatGHC(stats.value)} />
        <Stat label="Low / out" value={`${stats.low} / ${stats.out}`} warn={stats.low + stats.out > 0} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, barcode, category…"
            className="w-full rounded-2xl border border-input bg-background py-2.5 pl-9 pr-3 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", "All"],
              ["low", "Low stock"],
              ["out", "Out"],
              ["nobarcode", "No barcode"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                filter === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {label}
              {k === "nobarcode" && stats.noCode > 0 ? ` (${stats.noCode})` : ""}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Use the <strong>Import</strong> tab for CSV barcodes &amp; stock.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading inventory…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No products match.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="divide-y divide-border">
            {filtered.map((p) => {
              const low = p.stock > 0 && p.stock <= 3;
              const out = p.stock <= 0;
              const editing = editId === p.id;
              return (
                <div key={p.id} className="p-3 sm:p-4">
                  <div className="flex gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                      {p.image_url && (
                        <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatGHC(Number(p.price))}
                        {p.barcode ? ` · ${p.barcode}` : " · No barcode"}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            out
                              ? "bg-destructive/10 text-destructive"
                              : low
                                ? "bg-warning/15 text-warning-ink"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {(out || low) && <AlertTriangle className="h-3 w-3" />}
                          Stock {p.stock}
                        </span>
                      </div>
                    </div>
                    {!editing && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => bump.mutate({ id: p.id, delta: -1 })}
                          className="grid h-9 w-9 place-items-center rounded-xl border border-border"
                          aria-label="Decrease stock"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => bump.mutate({ id: p.id, delta: 1 })}
                          className="grid h-9 w-9 place-items-center rounded-xl border border-border"
                          aria-label="Increase stock"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="rounded-xl px-2.5 py-2 text-xs font-bold text-primary"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                  {editing && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <input
                        value={editStock}
                        onChange={(e) => setEditStock(e.target.value)}
                        type="number"
                        min={0}
                        step={1}
                        placeholder="Stock"
                        className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
                      />
                      <input
                        value={editBarcode}
                        onChange={(e) => setEditBarcode(e.target.value)}
                        placeholder="Barcode / SKU"
                        className="rounded-xl border border-input bg-background px-3 py-2 font-mono text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={saveRow.isPending}
                          onClick={() => {
                            const n = Number(editStock);
                            if (!Number.isInteger(n) || n < 0) return toast.error("Stock must be 0 or more");
                            saveRow.mutate({ id: p.id, stock: n, barcode: editBarcode });
                          }}
                          className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditId(null)}
                          className="rounded-xl border border-border px-3 py-2 text-sm font-semibold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`mt-0.5 font-display text-lg font-bold ${warn ? "text-warning-ink" : ""}`}>{value}</p>
    </div>
  );
}
