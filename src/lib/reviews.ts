import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Review = {
  id: string;
  product_id: string;
  user_id: string;
  seller_id: string | null;
  rating: number;
  body: string | null;
  verified_purchase: boolean;
  seller_reply: string | null;
  seller_replied_at: string | null;
  created_at: string;
  reviewer_name: string | null;
};

async function attachNames(rows: any[]): Promise<Review[]> {
  const ids = [...new Set(rows.map((r) => r.user_id))];
  if (ids.length === 0) return rows as Review[];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", ids);
  const map = new Map((profiles ?? []).map((p: any) => [p.id, p.display_name]));
  return rows.map((r) => ({ ...r, reviewer_name: map.get(r.user_id) ?? null }));
}

export function useProductReviews(productId: string | undefined) {
  return useQuery({
    queryKey: ["reviews", "product", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return attachNames(data ?? []);
    },
    enabled: !!productId,
  });
}

export function useSellerReviews(sellerId: string | undefined) {
  return useQuery({
    queryKey: ["reviews", "seller", sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, products(name, image_url)")
        .eq("seller_id", sellerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return attachNames(data ?? []);
    },
    enabled: !!sellerId,
  });
}

export function useSellerRating(sellerId: string | null | undefined) {
  return useQuery({
    queryKey: ["reviews", "seller-rating", sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("rating")
        .eq("seller_id", sellerId!);
      if (error) throw error;
      const rows = data ?? [];
      if (rows.length === 0) return null;
      const avg = rows.reduce((a, r) => a + r.rating, 0) / rows.length;
      return { avg: Math.round(avg * 10) / 10, count: rows.length };
    },
    enabled: !!sellerId,
  });
}

/** Products the signed-in user has ordered and can still review. */
export function useReviewableItems(userId: string | undefined) {
  return useQuery({
    queryKey: ["reviews", "reviewable", userId],
    queryFn: async () => {
      const { data: items, error } = await supabase
        .from("order_items")
        .select("id, product_id, name, image_url, orders!inner(user_id, status)")
        .eq("orders.user_id", userId!)
        .neq("orders.status", "cancelled");
      if (error) throw error;
      const { data: mine } = await supabase
        .from("reviews")
        .select("product_id")
        .eq("user_id", userId!);
      const reviewed = new Set((mine ?? []).map((r) => r.product_id));
      const seen = new Set<string>();
      return (items ?? [])
        .filter((i: any) => i.product_id && !reviewed.has(i.product_id) && !seen.has(i.product_id) && seen.add(i.product_id))
        .map((i: any) => ({
          order_item_id: i.id as string,
          product_id: i.product_id as string,
          name: i.name as string,
          image_url: i.image_url as string | null,
        }));
    },
    enabled: !!userId,
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      product_id: string;
      order_item_id?: string | null;
      rating: number;
      body: string;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sign in to leave a review.");
      const { error } = await supabase.from("reviews").insert({
        product_id: input.product_id,
        order_item_id: input.order_item_id ?? null,
        user_id: auth.user.id,
        rating: input.rating,
        body: input.body.trim() || null,
        verified_purchase: true,
      });
      if (error) {
        if (error.code === "23505") throw new Error("You've already reviewed this product.");
        throw error;
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["reviews"] });
      toast.success("Thanks! Your review is live.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSellerReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { review_id: string; reply: string }) => {
      const { error } = await supabase
        .from("reviews")
        .update({ seller_reply: input.reply.trim() || null, seller_replied_at: new Date().toISOString() })
        .eq("id", input.review_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews"] });
      toast.success("Reply saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Average rating + count for every reviewed product (one cached query for all cards). */
export function useProductRatingsMap() {
  return useQuery({
    queryKey: ["reviews", "ratings-map"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("product_id, rating");
      if (error) throw error;
      const acc: Record<string, { sum: number; count: number }> = {};
      for (const r of data ?? []) {
        const a = (acc[r.product_id] ??= { sum: 0, count: 0 });
        a.sum += r.rating;
        a.count += 1;
      }
      const out: Record<string, { avg: number; count: number }> = {};
      for (const [k, v] of Object.entries(acc)) out[k] = { avg: Math.round((v.sum / v.count) * 10) / 10, count: v.count };
      return out;
    },
  });
}
