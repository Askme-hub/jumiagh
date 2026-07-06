import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "./store";

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
