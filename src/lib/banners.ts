import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Banner = {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  cta_label: string | null;
  is_active: boolean;
  sort_order: number;
};

export const BANNERS_KEY = ["banners"] as const;

async function fetchBanners(activeOnly: boolean): Promise<Banner[]> {
  let q = supabase
    .from("banners")
    .select("id,title,subtitle,image_url,link_url,cta_label,is_active,sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (activeOnly) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Banner[];
}

export function useBanners(activeOnly = true) {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`banners-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "banners" }, () => {
        qc.invalidateQueries({ queryKey: BANNERS_KEY });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return useQuery({
    queryKey: [...BANNERS_KEY, activeOnly],
    queryFn: () => fetchBanners(activeOnly),
  });
}
