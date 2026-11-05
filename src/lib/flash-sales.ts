import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FlashSale = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  items: { product_id: string; sale_price: number }[];
};

/** The currently-live flash sale (if any), with its discounted items. */
export function useActiveFlashSale() {
  return useQuery({
    queryKey: ["active-flash-sale"],
    refetchInterval: 60_000,
    queryFn: async (): Promise<FlashSale | null> => {
      const now = new Date().toISOString();
      const { data: sale, error } = await supabase
        .from("flash_sales")
        .select("id, title, starts_at, ends_at")
        .eq("active", true)
        .lte("starts_at", now)
        .gte("ends_at", now)
        .order("ends_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!sale) return null;
      const { data: items, error: ie } = await supabase
        .from("flash_sale_items")
        .select("product_id, sale_price")
        .eq("flash_sale_id", sale.id);
      if (ie) throw ie;
      return { ...sale, items: items ?? [] };
    },
  });
}

/** Map product id → flash sale price for quick lookup. */
export function flashPriceMap(sale: FlashSale | null | undefined): Map<string, number> {
  const m = new Map<string, number>();
  for (const i of sale?.items ?? []) m.set(i.product_id, Number(i.sale_price));
  return m;
}
