import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Pencil, X, Check, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatGHC } from "@/lib/store";
import { toast } from "sonner";
import { ProductForm } from "@/components/ProductForm";

export const Route = createFileRoute("/admin/products")({ component: AdminProducts });

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
};

function AdminProducts() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const { data } = useQuery({
    queryKey: ["admin-products", filter],
    queryFn: async () => {
      let q = supabase.from("products").select("*").order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("approval_status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const setApproval = async (id: string, approval_status: "approved" | "rejected" | "pending") => {
    const { error } = await supabase.from("products").update({ approval_status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${approval_status}`);
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["products", "all"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    }
  };

  return (
    <div>
      <div className="p-3 flex flex-wrap gap-2 items-center justify-between border-b">
        <div className="flex gap-1.5 flex-wrap">
          {(["all", "pending", "approved", "rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-full font-bold uppercase ${
                filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <button onClick={() => setCreating(true)} className="bg-primary text-primary-foreground px-3 py-2 rounded text-sm font-bold flex items-center gap-1">
          <Plus size={16} /> Add
        </button>
      </div>

      <div className="md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3 md:p-3">
        {data?.map((p: any) => (
          <div key={p.id} className="flex gap-3 p-3 bg-card border-b md:border md:rounded-lg border-border">
            <div className="w-16 h-16 bg-muted rounded shrink-0">
              {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-contain" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm line-clamp-2">{p.name}</p>
              <p className="font-bold">{formatGHC(Number(p.price))}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${STATUS_STYLES[p.approval_status] ?? ""}`}>
                  {p.approval_status}
                </span>
                <span className="text-xs text-muted-foreground">Stock: {p.stock}</span>
                {p.seller_id && <span className="text-[10px] text-primary font-bold">SELLER</span>}
              </div>
              {p.approval_status !== "approved" && (
                <button onClick={() => setApproval(p.id, "approved")} className="mt-1 text-xs text-green-600 font-bold flex items-center gap-1">
                  <Check size={12} /> Approve
                </button>
              )}
              {p.approval_status !== "rejected" && p.seller_id && (
                <button onClick={() => setApproval(p.id, "rejected")} className="mt-1 ml-3 text-xs text-red-600 font-bold inline-flex items-center gap-1">
                  <Ban size={12} /> Reject
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => setEditing(p)} className="p-2 text-primary"><Pencil size={16} /></button>
              <button onClick={() => remove(p.id)} className="p-2 text-destructive"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>

      {(editing || creating) && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center" onClick={() => { setEditing(null); setCreating(false); }}>
          <div className="bg-background w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-xl md:rounded-xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-lg">{editing ? "Edit" : "New"} Product</h2>
              <button onClick={() => { setEditing(null); setCreating(false); }}><X /></button>
            </div>
            <ProductForm
              asAdmin
              initial={editing ?? undefined}
              onSaved={() => {
                setEditing(null);
                setCreating(false);
                qc.invalidateQueries({ queryKey: ["admin-products"] });
                qc.invalidateQueries({ queryKey: ["products", "all"] });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
