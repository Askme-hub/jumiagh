import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import c0 from "@/assets/categories/automobile.jpg.asset.json";
import c1 from "@/assets/categories/baby-products.jpg.asset.json";
import c2 from "@/assets/categories/books.jpg.asset.json";
import c3 from "@/assets/categories/computing.jpg.asset.json";
import c4 from "@/assets/categories/electronics.jpg.asset.json";
import c5 from "@/assets/categories/fashion.jpg.asset.json";
import c6 from "@/assets/categories/gaming.jpg.asset.json";
import c7 from "@/assets/categories/groceries.jpg.asset.json";
import c8 from "@/assets/categories/health-beauty.jpg.asset.json";
import c9 from "@/assets/categories/home-office.jpg.asset.json";
import c10 from "@/assets/categories/phones-tablets.jpg.asset.json";
import c11 from "@/assets/categories/sporting-goods.jpg.asset.json";

/** Built-in photos used when a category has no custom image. */
export const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  "automobile": c0.url,
  "baby-products": c1.url,
  "books": c2.url,
  "computing": c3.url,
  "electronics": c4.url,
  "fashion": c5.url,
  "gaming": c6.url,
  "groceries": c7.url,
  "health-beauty": c8.url,
  "home-office": c9.url,
  "phones-tablets": c10.url,
  "sporting-goods": c11.url,
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  sort_order: number;
};

export const CATEGORIES_KEY = ["categories"] as const;

async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id,name,slug,image_url,sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Category[]).map((c) => ({
    ...c,
    image_url: c.image_url || DEFAULT_CATEGORY_IMAGES[c.slug] || null,
  }));
}

/** Categories with live realtime updates (admin changes appear instantly). */
export function useCategories() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`categories-changes-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        () => qc.invalidateQueries({ queryKey: CATEGORIES_KEY })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return useQuery({ queryKey: CATEGORIES_KEY, queryFn: fetchCategories });
}
