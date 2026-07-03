import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Premium sellers can send a marketing SMS blast to customers who have
 * ordered from their shop.
 */
export const sendMarketingCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        message: z.string().trim().min(5).max(320),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verify active premium plan
    const { data: sub } = await supabaseAdmin
      .from("seller_subscriptions")
      .select("plan, status, expires_at")
      .eq("user_id", userId)
      .maybeSingle();
    const active =
      sub?.status === "active" &&
      (!sub.expires_at || new Date(sub.expires_at) > new Date());
    if (!active || sub?.plan !== "premium") {
      throw new Error("Marketing campaigns require an active Premium plan");
    }

    // Collect distinct buyer phones from this seller's orders
    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("order_id")
      .eq("seller_id", userId);
    const orderIds = [...new Set((items ?? []).map((i) => i.order_id))].filter(Boolean);
    if (orderIds.length === 0) return { sent: 0, detail: "No customers yet" };

    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("delivery_phone")
      .in("id", orderIds as string[]);

    const { normalizeGhanaPhone, sendSMS } = await import("./sms.server");
    const phones = [
      ...new Set(
        (orders ?? [])
          .map((o) => normalizeGhanaPhone(o.delivery_phone ?? ""))
          .filter(Boolean)
      ),
    ];
    if (phones.length === 0) return { sent: 0, detail: "No valid phone numbers" };

    const result = await sendSMS(phones, data.message);
    if (!result.ok) throw new Error(result.detail || "Campaign failed to send");
    return { sent: phones.length, detail: "Campaign sent" };
  });
