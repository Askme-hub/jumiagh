import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Zap, Plus, Trash2, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatGHC } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/flash-sales")({
  component: AdminFlashSales,
  head: () => ({ meta: [
    { title: "Flash Sales — Kivora Admin" },
    { name: "robots", content: "noindex" },
  ] }),
});

type Sale = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  active: boolean;
  items: { id: string; product_id: string; sale_price: number; product: { name: string; price: number; image_url: string | null } | null }[];
};

function AdminFlashSales() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", starts_at: "", ends_at: "" });
  const [addTo, setAddTo] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<{ id: string; name: string; price: number } | null>(null);
  const [salePrice, setSalePrice] = useState("");

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["admin-flash-sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flash_sales")
        .select("id, title, starts_at, ends_at, active, items:flash_sale_items(id, product_id, sale_price, product:products(name, price, image_url))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Sale[];
    },
  });

  const { data: results = [] } = useQuery({
    queryKey: ["flash-product-search", search],
    enabled: search.trim().length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price")
        .eq("approval_status", "approved")
        .ilike("name", `%${search.trim()}%`)
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-flash-sales"] });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Enter a title");
      if (!form.ends_at) throw new Error("Set an end date");
      const { error } = await supabase.from("flash_sales").insert({
        title: form.title.trim(),
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Flash sale created"); setShowForm(false); setForm({ title: "", starts_at: "", ends_at: "" }); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (s: Sale) => {
      const { error } = await supabase.from("flash_sales").update({ active: !s.active }).eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.message),
  });

  const removeSale = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("flash_sales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Flash sale deleted"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const addItem = useMutation({
    mutationFn: async () => {
      if (!addTo || !picked) throw new Error("Pick a product");
      const sp = Number(salePrice);
      if (!sp || sp <= 0) throw new Error("Enter a sale price");
      if (sp >= picked.price) throw new Error("Sale price must be below the normal price");
      const { error } = await supabase.from("flash_sale_items").insert({
        flash_sale_id: addTo,
        product_id: picked.id,
        sale_price: sp,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Product added to sale"); setPicked(null); setSearch(""); setSalePrice(""); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("flash_sale_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-foreground">Flash Sales</h1>
          <p className="text-xs text-muted-foreground">Time-limited deals shown on the homepage flash band.</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 rounded-full gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-soft"
        >
          <Plus size={14} /> {showForm ? "Close" : "New sale"}
        </button>
      </div>

      {showForm && (
        <div className="dashboard-panel space-y-3 p-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Title</span>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Black Friday Flash"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Starts (default: now)</span>
              <input type="datetime-local" value={form.starts_at}
                onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Ends</span>
              <input type="datetime-local" value={form.ends_at}
                onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </label>
          </div>
          <button onClick={() => create.mutate()} disabled={create.isPending}
            className="rounded-md bg-foreground px-5 py-2.5 text-sm font-bold text-background disabled:opacity-60">
            {create.isPending ? "Creating…" : "Create flash sale"}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
      ) : sales.length === 0 ? (
        <div className="dashboard-panel flex flex-col items-center gap-2 p-10 text-center">
          <Zap size={28} className="text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">No flash sales yet</p>
          <p className="text-xs text-muted-foreground">Create one above and add discounted products to it.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sales.map((s) => {
            const live = s.active && new Date(s.starts_at) <= new Date() && new Date(s.ends_at) > new Date();
            return (
              <div key={s.id} className="dashboard-panel p-4">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-extrabold text-foreground">{s.title}</p>
                      {live && <span className="rounded-full bg-flash px-2 py-0.5 text-[10px] font-bold uppercase text-flash-foreground">Live now</span>}
                      {!s.active && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">Disabled</span>}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {new Date(s.starts_at).toLocaleString()} → {new Date(s.ends_at).toLocaleString()} · {s.items.length} item(s)
                    </p>
                  </div>
                  <button onClick={() => toggle.mutate(s)}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${s.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    {s.active ? "Active" : "Disabled"}
                  </button>
                  <button onClick={() => setAddTo(addTo === s.id ? null : s.id)}
                    className="rounded-full bg-primary-soft px-3 py-1.5 text-[11px] font-bold text-primary">
                    + Add product
                  </button>
                  <button onClick={() => { if (confirm(`Delete flash sale "${s.title}"?`)) removeSale.mutate(s.id); }}
                    aria-label={`Delete flash sale ${s.title}`}
                    className="rounded-full p-2 text-muted-foreground transition hover:bg-flash/10 hover:text-flash">
                    <Trash2 size={15} />
                  </button>
                </div>

                {s.items.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {s.items.map((it) => (
                      <div key={it.id} className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2">
                        {it.product?.image_url && (
                          <img src={it.product.image_url} alt="" className="h-9 w-9 rounded-md object-cover" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-foreground">{it.product?.name ?? "Product"}</p>
                          <p className="text-[11px] text-muted-foreground">
                            <span className="line-through">{formatGHC(it.product?.price ?? 0)}</span>
                            <span className="ml-1.5 font-bold text-flash">{formatGHC(it.sale_price)}</span>
                          </p>
                        </div>
                        <button onClick={() => removeItem.mutate(it.id)} aria-label="Remove from sale"
                          className="rounded-full p-1.5 text-muted-foreground hover:text-flash">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {addTo === s.id && (
                  <div className="mt-3 space-y-2 rounded-lg border border-border p-3">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPicked(null); }}
                        placeholder="Search approved products…"
                        className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm"
                      />
                    </div>
                    {!picked && results.length > 0 && (
                      <div className="max-h-40 space-y-1 overflow-y-auto">
                        {results.map((p) => (
                          <button key={p.id} onClick={() => { setPicked(p); setSearch(p.name); }}
                            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted">
                            <span className="truncate font-semibold">{p.name}</span>
                            <span className="ml-2 shrink-0 text-muted-foreground">{formatGHC(p.price)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {picked && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min="0" step="0.01"
                          value={salePrice}
                          onChange={(e) => setSalePrice(e.target.value)}
                          placeholder={`Sale price (< ${formatGHC(picked.price)})`}
                          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                        />
                        <button onClick={() => addItem.mutate()} disabled={addItem.isPending}
                          className="rounded-md gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60">
                          {addItem.isPending ? "Adding…" : "Add"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
