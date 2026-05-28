import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatGHC } from "@/lib/store";

export const Route = createFileRoute("/seller/products/")({ component: SellerProducts });

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
};

function SellerProducts() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["seller-products", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const remove = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["seller-products", user?.id] });
  };

  return (
    <div>
      <div className="p-3 flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{data?.length ?? 0} products</p>
        <Link to="/seller/products/new" className="bg-primary text-primary-foreground px-3 py-2 rounded text-sm font-bold flex items-center gap-1">
          <Plus size={16} /> Add
        </Link>
      </div>

      {isLoading && <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && (data?.length ?? 0) === 0 && (
        <div className="p-10 text-center">
          <p className="text-muted-foreground">No products yet.</p>
          <Link to="/seller/products/new" className="inline-block mt-3 text-primary font-semibold">Add your first product</Link>
        </div>
      )}

      <div className="md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3 md:p-3">
        {data?.map((p: any) => (
          <div key={p.id} className="flex gap-3 p-3 bg-card border-b md:border md:rounded-lg border-border">
            <div className="w-16 h-16 bg-muted rounded shrink-0">
              {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-contain" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm line-clamp-2">{p.name}</p>
              <p className="font-bold">{formatGHC(Number(p.price))}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${STATUS_STYLES[p.approval_status] ?? ""}`}>
                  {p.approval_status}
                </span>
                <span className="text-xs text-muted-foreground">Stock: {p.stock}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Link to="/seller/products/$id" params={{ id: p.id }} className="p-2 text-primary"><Pencil size={16} /></Link>
              <button onClick={() => remove(p.id)} className="p-2 text-destructive"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
