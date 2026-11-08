import { doorDeliveryFee, normalizeZones, zoneForRegion } from "./delivery-zones";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ItemSchema = z.object({
  product_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(500),
  price: z.number().min(0),
  old_price: z.number().nullable().optional(),
  image_url: z.string().max(2000).nullable().optional(),
  qty: z.number().int().min(1).max(99),
});

const DeliverySchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(7).max(20).regex(/^[0-9+\-\s()]+$/),
  region: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  address: z.string().trim().min(5).max(500),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  delivery_type: z.enum(["door", "pickup"]).default("door"),
  pickup_station: z.string().trim().max(200).optional().or(z.literal("")),
});

/**
 * Place a Pay-on-Delivery order. No online payment is taken now — the buyer
 * pays cash/MoMo to the courier when the product is delivered. The seller is
 * credited by the existing delivery trigger once the item is marked delivered.
 */
export const placeCODOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        items: z.array(ItemSchema).min(1).max(100),
        delivery: DeliverySchema,
        coupon_code: z.string().trim().max(50).optional(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Phone must be SMS-verified
    const { normalizeGhanaPhone: norm } = await import("./sms.server");
    const { isPhoneVerified } = await import("./phone-otp.functions");
    const normPhone = norm(data.delivery.phone);
    if (!normPhone) throw new Error("Enter a valid Ghana phone number");
    if (!(await isPhoneVerified(supabaseAdmin, userId, normPhone)))
      throw new Error("Please verify your phone number with the SMS code first.");

    // 2) Limit open COD orders per buyer
    const { count: openCount } = await supabaseAdmin
      .from("orders").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("payment_method", "cod")
      .in("status", ["placed", "processing", "shipped"]);
    if ((openCount ?? 0) >= 3)
      throw new Error("You have 3 pending Pay on Delivery orders. Please receive them before ordering more.");

    // 3) Re-price every item from the database (never trust client prices)
    if (data.items.some((i) => !i.product_id)) throw new Error("Invalid cart item");
    const { data: dbProds } = await supabaseAdmin
      .from("products").select("id, name, price, old_price, image_url, stock, approval_status")
      .in("id", data.items.map((i) => i.product_id!) );
    const pmap = new Map((dbProds ?? []).map((p) => [p.id, p]));
    const { data: flash } = await supabaseAdmin
      .from("flash_sale_items").select("product_id, sale_price, flash_sales!inner(active, starts_at, ends_at)")
      .in("product_id", data.items.map((i) => i.product_id!));
    const now = Date.now();
    const flashPrice = new Map<string, number>();
    for (const f of (flash ?? []) as any[]) {
      const fs = f.flash_sales;
      if (fs?.active && new Date(fs.starts_at).getTime() <= now && new Date(fs.ends_at).getTime() > now)
        flashPrice.set(f.product_id, Number(f.sale_price));
    }
    data.items = data.items.map((i) => {
      const p = pmap.get(i.product_id!);
      if (!p || p.approval_status !== "approved") throw new Error(`${i.name} is no longer available`);
      if (p.stock < i.qty) throw new Error(`Only ${p.stock} unit(s) left for ${p.name}`);
      return { ...i, name: p.name, price: flashPrice.get(p.id) ?? Number(p.price), old_price: p.old_price, image_url: p.image_url };
    });

    // 3b) COD only when every shop is in the buyer's delivery region
    {
      const { data: sp } = await supabaseAdmin.from("products").select("seller_id").in("id", data.items.map((i) => i.product_id!));
      const sids = [...new Set((sp ?? []).map((p: any) => p.seller_id).filter(Boolean))] as string[];
      if (sids.length > 0) {
        const { data: shops } = await supabaseAdmin.from("seller_profiles").select("shop_name, store_region, deliver_all_regions").in("user_id", sids);
        const far = (shops ?? []).filter((s: any) => !s.deliver_all_regions && (s.store_region ?? "") !== data.delivery.region);
        if (far.length > 0)
          throw new Error(`Pay on Delivery is only available for shops in ${data.delivery.region}. ${far.map((s: any) => s.shop_name).join(", ")} ships from another region — please pay online.`);
      }
    }

    // Server-side totals (never trust the client)
    const itemsTotal = data.items.reduce((a, i) => a + i.price * i.qty, 0);
    const itemCount = data.items.reduce((a, i) => a + i.qty, 0);

    // Delivery fee comes from the sellers' store settings
    const { data: zoneRows } = await supabaseAdmin.from("delivery_zones").select("*").order("sort");
    const zones = normalizeZones(zoneRows);
    const productIds = data.items.map((i) => i.product_id).filter(Boolean) as string[];
    let shipping = data.delivery.delivery_type === "pickup" ? 10 : itemsTotal >= 150 ? 0 : zoneForRegion(data.delivery.region, zones).fee;
    if (productIds.length > 0) {
      const { data: prods } = await supabaseAdmin
        .from("products")
        .select("seller_id")
        .in("id", productIds);
      const sellerIds = [...new Set((prods ?? []).map((p) => p.seller_id).filter(Boolean))] as string[];
      if (sellerIds.length > 0) {
        const { data: sellers } = await supabaseAdmin
          .from("seller_profiles")
          .select("door_delivery_fee, pickup_enabled, pickup_fee")
          .in("user_id", sellerIds);
        if (sellers && sellers.length > 0) {
          if (data.delivery.delivery_type === "pickup") {
            const p = sellers.filter((s: any) => s.pickup_enabled).reduce((a: number, s: any) => a + Number(s.pickup_fee ?? 10), 0);
            shipping = p > 0 ? p : 10;
          } else {
            shipping = doorDeliveryFee(data.delivery.region, sellers.map((s: any) => Number(s.door_delivery_fee ?? 0)), zones);
          }
        }
      }
    }
    // Coupon discount is always recomputed server-side
    let discount = 0;
    if (data.coupon_code) {
      const { computeCouponDiscount } = await import("./coupons.functions");
      const res = await computeCouponDiscount(data.coupon_code, data.items);
      if (!res.valid) throw new Error(res.message);
      discount = res.discount;
    }
    const total = Math.max(0, itemsTotal + shipping - discount);
    if (total <= 0) throw new Error("Invalid cart total");
    if (total > 1500) throw new Error("Pay on Delivery is limited to GH₵ 1,500 per order.");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        total,
        item_count: itemCount,
        status: "placed",
        payment_status: "pending",
        payment_method: "cod",
        delivery_name: data.delivery.name,
        delivery_phone: data.delivery.phone,
        delivery_region: data.delivery.region,
        delivery_city: data.delivery.city,
        delivery_address: data.delivery.address,
        delivery_notes: data.delivery.notes || null,
        delivery_type: data.delivery.delivery_type,
        pickup_station: data.delivery.pickup_station || null,
        shipping_fee: shipping,
        delivery_zone: data.delivery.delivery_type === "pickup" ? null : zoneForRegion(data.delivery.region, zones).id,
        discount,
        coupon_code: data.coupon_code ? data.coupon_code.trim().toUpperCase() : null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const { error: ie } = await supabaseAdmin
      .from("order_items")
      .insert(data.items.map((i) => ({ ...i, order_id: order.id })));
    if (ie) {
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      throw new Error(ie.message);
    }

    const orderRef = order.order_number ?? order.id.slice(0, 8);

    // Record the coupon use (best-effort)
    if (data.coupon_code && discount > 0) {
      const { redeemCoupon } = await import("./coupons.functions");
      await redeemCoupon(data.coupon_code);
    }

    // Buyer inbox confirmation
    await supabaseAdmin.from("inbox_messages").insert({
      user_id: order.user_id,
      title: `Order #${orderRef} placed`,
      body: `Thank you! Your Pay on Delivery order of ${order.item_count} item(s) totalling GH₵ ${Number(order.total).toFixed(2)} has been received. Please have the amount ready to pay the courier on delivery.`,
    });

    // SMS notifications (best-effort, never block)
    const { trySendSMS, normalizeGhanaPhone } = await import("./sms.server");
    const itemLines = data.items
      .map((i) => `${i.qty} x ${String(i.name).slice(0, 40)}`)
      .join(", ");
    const dest =
      order.delivery_type === "pickup"
        ? `Pickup: ${order.pickup_station ?? "station"}`
        : `Delivery: ${[order.delivery_address, order.delivery_city, order.delivery_region].filter(Boolean).join(", ")}`;
    const { data: __shopItems } = await supabaseAdmin.from("order_items").select("seller_id").eq("order_id", order.id);
      const __sids = [...new Set((__shopItems ?? []).map((i: any) => i.seller_id).filter(Boolean))] as string[];
      const { data: __shops } = __sids.length ? await supabaseAdmin.from("seller_profiles").select("user_id, shop_name").in("user_id", __sids) : { data: [] as any[] };
      const shopMap = new Map((__shops ?? []).map((x: any) => [x.user_id, x.shop_name as string]));
      const shopNames = [...shopMap.values()].filter(Boolean).join(", ");
    if (order.delivery_phone) {
      await trySendSMS(
        order.delivery_phone,
        `KIVORA GH\nOrder #${orderRef} PLACED (Pay on Delivery)${shopNames ? ` from ${shopNames}` : ""}.\nItems: ${itemLines}\nAmount due on delivery: GH${"\u20B5"} ${Number(order.total).toFixed(2)}\n${dest}\nPlease have the exact amount (cash or MoMo) ready for the courier. Track it in the Kivora app.`
      );
    }


    // Alert each seller in the order
    const { data: soldItems } = await supabaseAdmin
      .from("order_items")
      .select("seller_id")
      .eq("order_id", order.id);
    const sellerIds = [
      ...new Set((soldItems ?? []).map((i) => i.seller_id).filter(Boolean)),
    ] as string[];
    if (sellerIds.length > 0) {
      const { data: sellerProfiles } = await supabaseAdmin
        .from("seller_profiles")
        .select("user_id, phone, shop_name")
        .in("user_id", sellerIds);
      for (const sp of sellerProfiles ?? []) {
        if (sp.phone && normalizeGhanaPhone(sp.phone)) {
          await trySendSMS(
            sp.phone,
            `KIVORA GH - ${sp.shop_name}\nNew PAY ON DELIVERY order #${orderRef}.\nItems: ${itemLines}\nCollect GH${"\u20B5"} ${Number(order.total).toFixed(2)} on delivery.\nBuyer: ${order.delivery_name ?? ""} (${order.delivery_phone ?? "n/a"})\n${dest}\nLog in to your Seller Hub to process it.`
          );

        }
        if (sp.user_id) {
          await supabaseAdmin.from("inbox_messages").insert({
            user_id: sp.user_id,
            title: `${sp.shop_name}: new order #${orderRef}`,
            body: `You have a new Pay on Delivery order. Head to your Seller Hub → Orders to process it.`,
          });
        }
      }
    }

    const { flushPushNotifications } = await import("./push.server");
    await flushPushNotifications();
    return { order_id: order.id, order_number: orderRef };
  });
