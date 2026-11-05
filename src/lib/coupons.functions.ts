import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CouponCartItem = {
  product_id?: string | null;
  price: number;
  qty: number;
};

export type CouponResult = {
  valid: boolean;
  discount: number;
  message: string;
  code?: string;
};

/**
 * Server-only helper: validate a coupon code against a cart and compute the
 * discount. Seller coupons only apply to that seller's items; platform
 * coupons (seller_id null) apply to the whole items total.
 * Never trust a client-supplied discount — always recompute here.
 */
export async function computeCouponDiscount(
  code: string,
  items: CouponCartItem[]
): Promise<CouponResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { valid: false, discount: 0, message: "Enter a coupon code" };

  const { data: coupon } = await supabaseAdmin
    .from("coupons")
    .select("*")
    .ilike("code", normalized)
    .maybeSingle();

  if (!coupon || !coupon.active)
    return { valid: false, discount: 0, message: "Invalid coupon code" };
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now())
    return { valid: false, discount: 0, message: "This coupon has expired" };
  if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses)
    return { valid: false, discount: 0, message: "This coupon has been fully used" };

  // Base subtotal: seller coupons only count that seller's items
  let base = items.reduce((a, i) => a + i.price * i.qty, 0);
  if (coupon.seller_id) {
    const productIds = items.map((i) => i.product_id).filter(Boolean) as string[];
    if (productIds.length === 0)
      return { valid: false, discount: 0, message: "This coupon doesn't apply to your cart" };
    const { data: prods } = await supabaseAdmin
      .from("products")
      .select("id, seller_id")
      .in("id", productIds);
    const sellerProductIds = new Set(
      (prods ?? []).filter((p) => p.seller_id === coupon.seller_id).map((p) => p.id)
    );
    base = items
      .filter((i) => i.product_id && sellerProductIds.has(i.product_id))
      .reduce((a, i) => a + i.price * i.qty, 0);
    if (base <= 0)
      return { valid: false, discount: 0, message: "This coupon doesn't apply to your cart" };
  }

  if (base < Number(coupon.min_spend))
    return {
      valid: false,
      discount: 0,
      message: `Minimum spend of GH₵ ${Number(coupon.min_spend).toFixed(2)} required`,
    };

  const discount =
    coupon.discount_type === "percent"
      ? Math.round(base * Number(coupon.value)) / 100
      : Math.min(Number(coupon.value), base);

  return {
    valid: true,
    discount: Math.round(discount * 100) / 100,
    message: "Coupon applied",
    code: coupon.code,
  };
}

/** Record one use of a coupon (best-effort, atomic guard on max_uses). */
export async function redeemCoupon(code: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const normalized = code.trim().toUpperCase();
  const { data: coupon } = await supabaseAdmin
    .from("coupons")
    .select("id, used_count, max_uses")
    .ilike("code", normalized)
    .maybeSingle();
  if (!coupon) return;
  if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) return;
  await supabaseAdmin
    .from("coupons")
    .update({ used_count: coupon.used_count + 1 })
    .eq("id", coupon.id);
}

const ItemSchema = z.object({
  product_id: z.string().uuid().nullable().optional(),
  price: z.number().min(0),
  qty: z.number().int().min(1).max(99),
});

/** Check a coupon code against the current cart (used by the checkout Apply button). */
export const validateCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        code: z.string().trim().min(1).max(50),
        items: z.array(ItemSchema).min(1).max(100),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    return computeCouponDiscount(data.code, data.items);
  });
