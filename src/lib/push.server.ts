// Server-only Web Push (VAPID + RFC 8291 aes128gcm) using WebCrypto — works on Cloudflare Workers.
import { VAPID_PUBLIC_KEY } from "./push-config";

const enc = new TextEncoder();

function b64uToBytes(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
function bytesToB64u(b: Uint8Array): string {
  let s = "";
  b.forEach((x) => (s += String.fromCharCode(x)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", key as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data as BufferSource));
}
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number) {
  const prk = await hmac(salt, ikm);
  const t = await hmac(prk, concat(info, new Uint8Array([1])));
  return t.slice(0, len);
}

async function vapidAuth(endpoint: string): Promise<string> {
  const jwk = JSON.parse(process.env.VAPID_PRIVATE_JWK || "{}");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const aud = new URL(endpoint).origin;
  const header = bytesToB64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = bytesToB64u(enc.encode(JSON.stringify({
    aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "mailto:support@kivoragh.shop",
  })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${header}.${body}`)));
  return `vapid t=${header}.${body}.${bytesToB64u(sig)}, k=${VAPID_PUBLIC_KEY}`;
}

async function encrypt(p256dh: string, authSecret: string, payload: Uint8Array) {
  const uaPublic = b64uToBytes(p256dh);
  const auth = b64uToBytes(authSecret);
  const local = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublic as BufferSource, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, local.privateKey, 256));
  const ikm = await hkdf(auth, shared, concat(enc.encode("WebPush: info\0"), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const aes = await crypto.subtle.importKey("raw", cek as BufferSource, "AES-GCM", false, ["encrypt"]);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce as BufferSource }, aes, concat(payload, new Uint8Array([2])) as BufferSource));
  const rs = new Uint8Array([0, 0, 16, 0]); // 4096
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, cipher);
}

export type PushPayload = { title: string; body?: string | null; url?: string | null };

/** Send a push; returns HTTP status (404/410 mean the subscription is gone). */
export async function sendPush(sub: { endpoint: string; p256dh: string; auth: string }, payload: PushPayload) {
  const body = await encrypt(sub.p256dh, sub.auth, enc.encode(JSON.stringify(payload)));
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: await vapidAuth(sub.endpoint),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "86400",
      Urgency: "high",
    },
    body: body as BodyInit,
  });
  return res.status;
}

/** Push every not-yet-pushed notification for these users. Best-effort, never throws. */
export async function flushPushNotifications(userIds?: string[]) {
  try {
    if (!process.env.VAPID_PRIVATE_JWK) return;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("notifications").select("id, user_id, title, body, link")
      .eq("pushed", false).gte("created_at", new Date(Date.now() - 3600_000).toISOString()).limit(100);
    if (userIds && userIds.length) q = q.in("user_id", userIds);
    const { data: notes } = await q;
    if (!notes?.length) return;
    await supabaseAdmin.from("notifications").update({ pushed: true }).in("id", notes.map((n) => n.id));
    const users = [...new Set(notes.map((n) => n.user_id))];
    const { data: subs } = await supabaseAdmin.from("push_subscriptions").select("*").in("user_id", users);
    const dead: string[] = [];
    await Promise.allSettled(notes.flatMap((n) =>
      (subs ?? []).filter((s) => s.user_id === n.user_id).map(async (s) => {
        const st = await sendPush(s, { title: n.title, body: n.body, url: n.link });
        if (st === 404 || st === 410) dead.push(s.id);
      })
    ));
    if (dead.length) await supabaseAdmin.from("push_subscriptions").delete().in("id", dead);
  } catch (e) {
    console.error("push flush failed", e);
  }
}
