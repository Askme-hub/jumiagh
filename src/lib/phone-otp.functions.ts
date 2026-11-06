import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const PhoneInput = z.object({ phone: z.string().trim().min(7).max(20) });

export const sendPhoneOTP = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => PhoneInput.parse(i))
  .handler(async ({ data, context }) => {
    const { normalizeGhanaPhone, sendSMS } = await import("./sms.server");
    const phone = normalizeGhanaPhone(data.phone);
    if (!phone) throw new Error("Enter a valid Ghana phone number");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Rate limit: max 3 codes per 10 minutes, 60s between sends
    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("phone_verifications").select("created_at")
      .eq("user_id", context.userId).gte("created_at", since)
      .order("created_at", { ascending: false });
    if ((recent?.length ?? 0) >= 3) throw new Error("Too many codes requested. Try again in 10 minutes.");
    if (recent?.[0] && Date.now() - new Date(recent[0].created_at).getTime() < 60_000)
      throw new Error("Please wait a minute before requesting another code.");

    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    const code = String(arr[0] % 1_000_000).padStart(6, "0");
    const { error } = await supabaseAdmin.from("phone_verifications").insert({
      user_id: context.userId, phone,
      code_hash: await sha256(`${phone}:${code}`),
      expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    });
    if (error) throw new Error("Could not create code");
    const r = await sendSMS(phone, `Kivora: Your verification code is ${code}. Valid for 5 minutes. Do not share it.`);
    if (!r.ok) throw new Error("Could not send SMS. Check the number and try again.");
    return { ok: true };
  });

export const verifyPhoneOTP = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => PhoneInput.extend({ code: z.string().regex(/^\d{6}$/) }).parse(i))
  .handler(async ({ data, context }) => {
    const { normalizeGhanaPhone } = await import("./sms.server");
    const phone = normalizeGhanaPhone(data.phone);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("phone_verifications").select("*")
      .eq("user_id", context.userId).eq("phone", phone).is("verified_at", null)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!row) throw new Error("Request a new code");
    if (new Date(row.expires_at).getTime() < Date.now()) throw new Error("Code expired. Request a new one.");
    if (row.attempts >= 5) throw new Error("Too many attempts. Request a new code.");
    if ((await sha256(`${phone}:${data.code}`)) !== row.code_hash) {
      await supabaseAdmin.from("phone_verifications").update({ attempts: row.attempts + 1 }).eq("id", row.id);
      throw new Error("Incorrect code");
    }
    await supabaseAdmin.from("phone_verifications").update({ verified_at: new Date().toISOString() }).eq("id", row.id);
    return { ok: true };
  });

/** Server-only check used by COD order placement (verified within 24h). */
export async function isPhoneVerified(admin: any, userId: string, phone: string) {
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data } = await admin.from("phone_verifications").select("id")
    .eq("user_id", userId).eq("phone", phone).gte("verified_at", since).limit(1);
  return (data?.length ?? 0) > 0;
}
