import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normalizeZones } from "./delivery-zones";

export function useDeliveryZones() {
  return useQuery({
    queryKey: ["delivery-zones"],
    queryFn: async () => {
      const { data, error } = await supabase.from("delivery_zones").select("*").order("sort");
      if (error) throw error;
      return normalizeZones(data);
    },
    staleTime: 60_000,
  });
}
