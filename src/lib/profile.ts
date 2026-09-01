import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

export function profileQueryKey(userId: string | undefined) {
  return ["profile", userId] as const;
}

/** Shared profile query so avatar/name updates propagate everywhere at once. */
export function useProfile(userId: string | undefined | null) {
  return useQuery({
    queryKey: profileQueryKey(userId ?? undefined),
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, email, avatar_url")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data as Profile) ?? null;
    },
  });
}
