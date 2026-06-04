import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type PayoutAccount = {
  id: string;
  seller_id: string;
  method: string;
  account_name: string;
  account_number: string;
  provider: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export function usePayoutAccounts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["payout-accounts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payout_accounts")
        .select("*")
        .eq("seller_id", user!.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PayoutAccount[];
    },
  });
}

export function useSavePayoutAccount() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      method: string;
      account_name: string;
      account_number: string;
      provider?: string | null;
      is_default?: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");
      if (input.is_default) {
        await supabase
          .from("payout_accounts")
          .update({ is_default: false })
          .eq("seller_id", user.id);
      }
      const { data, error } = await supabase
        .from("payout_accounts")
        .insert({
          seller_id: user.id,
          method: input.method,
          account_name: input.account_name,
          account_number: input.account_number,
          provider: input.provider ?? null,
          is_default: input.is_default ?? false,
        })
        .select()
        .single();
      if (error) throw error;
      return data as PayoutAccount;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payout-accounts", user?.id] }),
  });
}

export function useDeletePayoutAccount() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payout_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payout-accounts", user?.id] }),
  });
}
