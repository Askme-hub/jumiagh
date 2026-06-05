import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  return (data ?? []) as Category[];
}

/** Categories with live realtime updates (admin changes appear instantly). */
export function useCategories() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("categories-changes")
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
