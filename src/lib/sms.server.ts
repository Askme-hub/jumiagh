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
 * Endpoint & params per https://bulksmsghana.com/developer/ :
 *   https://clientlogin.bulksmsgh.com/smsapi?key=..&to=..&msg=..&sender_id=..
 */
const SMS_STATUS: Record<string, string> = {
  "1000": "Message sent",
  "1002": "Message not sent",
  "1003": "Insufficient balance",
  "1004": "Invalid API key",
  "1005": "Phone number not valid",
  "1006": "Invalid Sender ID",
  "1007": "Scheduled for later delivery",
  "1008": "Empty message",
};

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

  const url = new URL("https://clientlogin.bulksmsgh.com/smsapi");
  url.searchParams.set("key", key);
  url.searchParams.set("to", contacts);
  url.searchParams.set("msg", message);
  url.searchParams.set("sender_id", sender);

  try {
    const res = await fetch(url.toString(), { method: "GET" });
    const body = (await res.text()).trim();
    // BulkSMSGhana returns "1000" on success (plain text or JSON-wrapped).
    const code = (body.match(/100\d/) ?? [])[0] ?? "";
    const ok = res.ok && code === "1000";
    const detail = SMS_STATUS[code] ?? (body.slice(0, 300) || "Unknown response");
    return { ok, detail };
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
