import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VAPID_PUBLIC_KEY } from "./push-config";

function urlB64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function inIframe() {
  try { return window.self !== window.top; } catch { return true; }
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const regs = await navigator.serviceWorker.getRegistrations();
  const main = regs.find((r) => (r.active?.scriptURL || "").endsWith("/sw.js"));
  if (main) return main;
  const existing = regs.find((r) => (r.active?.scriptURL || r.installing?.scriptURL || "").endsWith("/push-sw.js"));
  if (existing) return existing;
  // Push-only worker (no caching) — safe in previews.
  const reg = await navigator.serviceWorker.register("/push-sw.js", { scope: "/push-scope/" });
  await new Promise<void>((resolve) => {
    if (reg.active) return resolve();
    const w = reg.installing || reg.waiting;
    w?.addEventListener("statechange", () => w.state === "activated" && resolve());
    setTimeout(resolve, 4000);
  });
  return reg;
}

export function usePushStatus() {
  const [state, setState] = useState<"unsupported" | "blocked" | "off" | "on" | "loading">("loading");
  const refresh = async () => {
    if (!pushSupported() || inIframe()) return setState("unsupported");
    if (Notification.permission === "denied") return setState("blocked");
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const r of regs) {
      if (await r.pushManager.getSubscription()) return setState("on");
    }
    setState("off");
  };
  useEffect(() => { void refresh(); }, []);
  return { state, refresh };
}

export async function enablePush(userId: string) {
  if (!pushSupported()) throw new Error("This browser doesn't support notifications.");
  if (inIframe()) throw new Error("Open the app in its own tab to turn on notifications.");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Notifications were not allowed.");
  const reg = await getRegistration();
  const sub = (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY) }));
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id: userId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
    { onConflict: "endpoint" }
  );
  if (error) throw error;
}

export async function disablePush() {
  const regs = await navigator.serviceWorker.getRegistrations();
  for (const r of regs) {
    const sub = await r.pushManager.getSubscription();
    if (sub) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
  }
}
