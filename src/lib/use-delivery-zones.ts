import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normalizeZones } from "./delivery-zones";

export function useDeliveryZones() {
  return useQuery({
    queryKey: ["delivery-zones"],
    queryFn: async () => {
      const { data } = await supabase.from("delivery_zones").select("*").order("sort");
      return normalizeZones(data);
    },
    staleTime: 60_000,
  });
}
