import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toProduct, type DbProduct } from "./products";

export type PublicStore = {
  user_id: string;
  slug: string;
  shop_name: string;
  bio: string | null;
  logo_url: string | null;
  banner_url: string | null;
  location: string | null;
  whatsapp_number: string | null;
  business_category: string | null;
  status: string;
  created_at: string;
  product_count: number;
};

export function usePublicStore(slug: string) {
  return useQuery({
    queryKey: ["public-store", slug],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("public_store", { _slug: slug });
      if (error) throw error;
      const row = (data as PublicStore[] | null)?.[0] ?? null;
      return row;
    },
    enabled: !!slug,
  });
}

export function useStoreProducts(sellerId: string | undefined) {
  return useQuery({
    queryKey: ["store-products", sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", sellerId!)
        .eq("approval_status", "approved")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as DbProduct[]).map(toProduct);
    },
    enabled: !!sellerId,
  });
}
