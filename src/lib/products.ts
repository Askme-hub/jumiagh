import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useShop, type Product } from "./store";

export type DbProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  old_price: number | null;
  image_url: string | null;
  stock: number;
  discount: number | null;
  category: string | null;
  seller_id?: string | null;
};

export const toProduct = (p: DbProduct): Product => ({
  id: p.id,
  name: p.name,
  price: Number(p.price),
  oldPrice: p.old_price != null ? Number(p.old_price) : undefined,
  image: p.image_url ?? "",
  stock: p.stock,
  discount: p.discount ?? undefined,
  sellerId: p.seller_id ?? undefined,
});

export function useProducts(category?: string) {
  return useQuery({
    queryKey: ["products", category ?? "all"],
    queryFn: async () => {
      let q = supabase.from("products").select("*").order("created_at", { ascending: false });
      if (category) q = q.eq("category", category);
      const { data, error } = await q;
      if (error) throw error;
      return (data as DbProduct[]).map(toProduct);
    },
  });
}

/**
 * Keeps product stock in sync in real time: listens to `products` table changes,
 * refreshes product queries and clamps cart quantities to what's still available.
 */
export function useLiveStock() {
  const qc = useQueryClient();
  const syncStock = useShop((s) => s.syncStock);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const ids = useShop.getState().cart.map((c) => c.product.id);
      if (ids.length === 0) return;
      const { data, error } = await supabase
        .from("products")
        .select("id, stock")
        .in("id", ids);
      if (error || cancelled || !data) return;
      const map: Record<string, number> = {};
      for (const row of data as { id: string; stock: number }[]) map[row.id] = row.stock;
      syncStock(map);
    };

    refresh();

    const channel = supabase
      .channel(`products-stock-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        qc.invalidateQueries({ queryKey: ["products"] });
        qc.invalidateQueries({ queryKey: ["products-grouped"] });
        refresh();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [qc, syncStock]);
}
