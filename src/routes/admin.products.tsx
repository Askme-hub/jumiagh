import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatGHC } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/products")({ component: AdminProducts });

type Form = {
  id?: string;
  name: string;
  price: string;
  old_price: string;
  image_url: string;
  stock: string;
  discount: string;
  category: string;
  description: string;
};

const empty: Form = { name: "", price: "", old_price: "", image_url: "", stock: "0", discount: "", category: "", description: "" };

function AdminProducts() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Form | null>(null);

  const { data } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = async () => {
    if (!editing) return;
    const payload = {
      name: editing.name,
      description: editing.description || null,
      price: Number(editing.price),
      old_price: editing.old_price ? Number(editing.old_price) : null,
      image_url: editing.image_url || null,
      stock: Number(editing.stock) || 0,
      discount: editing.discount ? Number(editing.discount) : null,
      category: editing.category || null,
    };
    const { error } = editing.id
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    if (error) toast.error(error.message);
    else {
      toast.success("Saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products", "all"] });
    }
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
      <div className="p-3 flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{data?.length ?? 0} products</p>
        <button onClick={() => setEditing(empty)} className="bg-primary text-primary-foreground px-3 py-2 rounded text-sm font-bold flex items-center gap-1">
          <Plus size={16} /> Add
        </button>
      </div>

      {data?.map((p: any) => (
        <div key={p.id} className="flex gap-3 p-3 bg-card border-b border-border">
          <div className="w-16 h-16 bg-muted rounded">
            {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-contain" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm line-clamp-2">{p.name}</p>
            <p className="font-bold">{formatGHC(Number(p.price))}</p>
            <p className="text-xs text-muted-foreground">Stock: {p.stock} · {p.category ?? "—"}</p>
          </div>
          <div className="flex flex-col gap-1">
            <button onClick={() => setEditing({
              id: p.id, name: p.name, price: String(p.price), old_price: p.old_price ? String(p.old_price) : "",
              image_url: p.image_url ?? "", stock: String(p.stock), discount: p.discount ? String(p.discount) : "",
              category: p.category ?? "", description: p.description ?? "",
            })} className="p-2 text-primary"><Pencil size={16} /></button>
            <button onClick={() => remove(p.id)} className="p-2 text-destructive"><Trash2 size={16} /></button>
          </div>
        </div>
      ))}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={() => setEditing(null)}>
          <div className="bg-background w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-lg">{editing.id ? "Edit" : "New"} Product</h2>
              <button onClick={() => setEditing(null)}><X /></button>
            </div>
            <div className="space-y-2">
              {([["name","Name"],["price","Price (GHC)"],["old_price","Old price (optional)"],["image_url","Image URL (e.g. /assets/x.jpg)"],["stock","Stock"],["discount","Discount %"],["category","Category"],["description","Description"]] as const).map(([k, l]) => (
                <input key={k} placeholder={l} value={(editing as any)[k]}
                  onChange={(e) => setEditing({ ...editing, [k]: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              ))}
              <button onClick={save} className="w-full bg-primary text-primary-foreground font-bold py-3 rounded mt-2">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
