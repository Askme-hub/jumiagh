import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SellerDelivery = {
  user_id: string;
  shop_name: string;
  door_delivery_fee: number;
  pickup_enabled: boolean;
  pickup_station: string | null;
  pickup_region: string | null;
  pickup_fee: number;
};

/** Fetch delivery settings for the given seller ids (approved shops, public-readable). */
export function useSellerDelivery(sellerIds: string[]) {
  const ids = Array.from(new Set(sellerIds.filter(Boolean))).sort();
  return useQuery({
    queryKey: ["seller-delivery", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async (): Promise<SellerDelivery[]> => {
      const { data, error } = await supabase
        .from("seller_profiles")
        .select("user_id, shop_name, door_delivery_fee, pickup_enabled, pickup_station, pickup_region, pickup_fee")
        .in("user_id", ids);
      if (error) throw error;
      return (data ?? []).map((d: any) => ({
        user_id: d.user_id,
        shop_name: d.shop_name,
        door_delivery_fee: Number(d.door_delivery_fee ?? 25),
        pickup_enabled: Boolean(d.pickup_enabled),
        pickup_station: d.pickup_station ?? null,
        pickup_region: d.pickup_region ?? null,
        pickup_fee: Number(d.pickup_fee ?? 10),
      }));
    },
  });
}
