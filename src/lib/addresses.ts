import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Address = {
  id: string;
  user_id: string;
  label: string | null;
  full_name: string;
  phone: string;
  region: string;
  city: string;
  address: string;
  notes: string | null;
  delivery_type: "door" | "pickup";
  pickup_station: string | null;
  is_default: boolean;
};

export function useAddresses(enabled = true) {
  return useQuery({
    queryKey: ["addresses"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Address[];
    },
  });
}

export function useSaveAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Address, "id" | "user_id" | "is_default"> & { is_default?: boolean }) => {
      const { data: sess } = await supabase.auth.getUser();
      const user = sess.user;
      if (!user) throw new Error("Not signed in");
      const isDefault = !!input.is_default;
      if (isDefault) {
        await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
      }
      const { data, error } = await supabase
        .from("addresses")
        .insert({ ...input, user_id: user.id, is_default: isDefault })
        .select()
        .single();
      if (error) throw error;
      return data as Address;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
  });
}

export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("addresses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
  });
}
