import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const withdrawalSchema = z.object({
  amount: z.number().positive().max(10_000_000),
  method: z.string().min(2).max(50),
  account_details: z.string().min(2).max(500),
});

// Seller requests a withdrawal — moves funds from balance to pending.
export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => withdrawalSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: isSeller } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "seller")
      .maybeSingle();
    if (!isSeller) throw new Error("Only sellers can request withdrawals.");

    const { data: wallet } = await supabaseAdmin
      .from("seller_wallets")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    const balance = Number(wallet?.balance ?? 0);
    if (data.amount > balance) throw new Error("Withdrawal exceeds available balance.");

    const { data: request, error: reqErr } = await supabaseAdmin
      .from("withdrawal_requests")
      .insert({
        seller_id: userId,
        amount: data.amount,
        method: data.method,
        account_details: data.account_details,
        status: "pending",
      })
      .select()
      .single();
    if (reqErr) throw new Error(reqErr.message);

    const { error: walErr } = await supabaseAdmin
      .from("seller_wallets")
      .update({
        balance: balance - data.amount,
        pending: Number(wallet?.pending ?? 0) + data.amount,
      })
      .eq("user_id", userId);
    if (walErr) throw new Error(walErr.message);

    await supabaseAdmin.from("transactions").insert({
      seller_id: userId,
      type: "withdrawal_request",
      amount: -data.amount,
      status: "pending",
      description: `Withdrawal request via ${data.method}`,
    });

    return { id: request.id };
  });

const decisionSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["approved", "rejected", "paid"]),
  admin_note: z.string().max(500).optional(),
});

// Admin updates a withdrawal status and reconciles the seller wallet.
export const decideWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => decisionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: isAdmin } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!isAdmin) throw new Error("Only admins can manage withdrawals.");

    const { data: req, error: reqErr } = await supabaseAdmin
      .from("withdrawal_requests")
      .select("*")
      .eq("id", data.id)
      .single();
    if (reqErr || !req) throw new Error("Withdrawal request not found.");
    if (req.status === "paid" || req.status === "rejected") {
      throw new Error("This request has already been finalized.");
    }

    const { data: wallet } = await supabaseAdmin
      .from("seller_wallets")
      .select("balance, pending, total_withdrawn")
      .eq("user_id", req.seller_id)
      .maybeSingle();

    const amount = Number(req.amount);
    const pending = Number(wallet?.pending ?? 0);

    if (data.status === "rejected") {
      // refund pending back to balance
      await supabaseAdmin
        .from("seller_wallets")
        .update({
          pending: Math.max(0, pending - amount),
          balance: Number(wallet?.balance ?? 0) + amount,
        })
        .eq("user_id", req.seller_id);
      await supabaseAdmin.from("transactions").insert({
        seller_id: req.seller_id,
        type: "withdrawal_refund",
        amount,
        description: "Withdrawal rejected — funds returned",
      });
    } else if (data.status === "paid") {
      // remove from pending, add to total_withdrawn
      await supabaseAdmin
        .from("seller_wallets")
        .update({
          pending: Math.max(0, pending - amount),
          total_withdrawn: Number(wallet?.total_withdrawn ?? 0) + amount,
        })
        .eq("user_id", req.seller_id);
      await supabaseAdmin.from("transactions").insert({
        seller_id: req.seller_id,
        type: "withdrawal",
        amount: -amount,
        status: "completed",
        description: "Withdrawal paid out",
      });
    }

    const { error: updErr } = await supabaseAdmin
      .from("withdrawal_requests")
      .update({ status: data.status, admin_note: data.admin_note ?? null })
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);

    return { ok: true };
  });

// Admin fetches all withdrawal requests with seller shop info.
export const getAllWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: isAdmin } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!isAdmin) throw new Error("Forbidden");

    const { data: requests } = await supabaseAdmin
      .from("withdrawal_requests")
      .select("*")
      .order("created_at", { ascending: false });

    const ids = [...new Set((requests ?? []).map((r) => r.seller_id))];
    const { data: shops } = await supabaseAdmin
      .from("seller_profiles")
      .select("user_id, shop_name, phone")
      .in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const shopMap = new Map((shops ?? []).map((s) => [s.user_id, s]));

    return (requests ?? []).map((r) => ({
      ...r,
      shop_name: shopMap.get(r.seller_id)?.shop_name ?? "Unknown shop",
      shop_phone: shopMap.get(r.seller_id)?.phone ?? null,
    }));
  });
