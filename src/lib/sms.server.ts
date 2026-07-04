// Server-only BulkSMSGhana integration. Never import from client code.

export type SmsResult = { ok: boolean; detail: string };

/** Normalise Ghanaian numbers to the 233XXXXXXXXX format BulkSMSGhana expects. */
export function normalizeGhanaPhone(raw: string): string {
  let p = (raw || "").replace(/[^\d+]/g, "");
  if (!p) return "";
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("00")) p = p.slice(2);
  if (p.startsWith("0")) p = "233" + p.slice(1);
  else if (p.length === 9) p = "233" + p; // 9-digit local without leading 0
  return p.startsWith("233") && p.length >= 12 ? p : "";
}

/**
 * Send an SMS via BulkSMSGhana.
 * Requires BULKSMSGHANA_API_KEY. Optional BULKSMSGHANA_SENDER_ID (defaults to "KIVORA GH").
 */
export async function sendSMS(
  to: string | string[],
  message: string
): Promise<SmsResult> {
  const key = process.env.BULKSMSGHANA_API_KEY;
  const sender = process.env.BULKSMSGHANA_SENDER_ID || "KIVORA GH";
  if (!key) return { ok: false, detail: "SMS not configured" };

  const contacts = (Array.isArray(to) ? to : [to])
    .map(normalizeGhanaPhone)
    .filter(Boolean)
    .join(",");
  if (!contacts) return { ok: false, detail: "No valid recipients" };

  const url = new URL("https://www.bulksmsghana.com/smsapi");
  url.searchParams.set("key", key);
  url.searchParams.set("contacts", contacts);
  url.searchParams.set("from", sender);
  url.searchParams.set("msg", message);

  try {
    const res = await fetch(url.toString(), { method: "GET" });
    const body = (await res.text()).trim();
    // BulkSMSGhana returns "1000" on success; some responses embed "OK"/"success".
    const ok = res.ok && /(^|[^0-9])1000([^0-9]|$)|success|sent|ok/i.test(body);
    return { ok, detail: body.slice(0, 300) };
  } catch (e: any) {
    return { ok: false, detail: e?.message ?? "SMS request failed" };
  }
}

/** Best-effort send that never throws — use inside payment/order flows. */
export async function trySendSMS(to: string | string[], message: string) {
  try {
    const r = await sendSMS(to, message);
    if (!r.ok) console.warn("SMS not delivered:", r.detail);
    return r;
  } catch (e) {
    console.warn("SMS error:", e);
    return { ok: false, detail: "error" } as SmsResult;
  }
}
