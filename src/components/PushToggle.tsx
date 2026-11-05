import { useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { enablePush, disablePush, usePushStatus } from "@/lib/push";
import { sendTestPush } from "@/lib/push.functions";

export function PushToggle({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const { state, refresh } = usePushStatus();
  const [busy, setBusy] = useState(false);
  const test = useServerFn(sendTestPush);
  if (!user || state === "loading") return null;

  const on = async () => {
    setBusy(true);
    try {
      await enablePush(user.id);
      await test({});
      toast.success("Notifications turned on");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't turn on notifications");
    } finally { setBusy(false); void refresh(); }
  };
  const off = async () => {
    setBusy(true);
    try { await disablePush(); toast.success("Notifications turned off"); }
    finally { setBusy(false); void refresh(); }
  };

  return (
    <div className={`flex items-center gap-3 rounded-xl border border-border bg-card ${compact ? "p-3" : "p-4"}`}>
      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary grid place-items-center shrink-0">
        {state === "on" ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Push notifications</p>
        <p className="text-xs text-muted-foreground">
          {state === "on" && "On — you'll get order, delivery and message alerts on this device."}
          {state === "off" && "Get instant alerts for orders, deliveries and messages."}
          {state === "blocked" && "Blocked in your browser settings. Allow notifications for this site to turn on."}
          {state === "unsupported" && "Open Kivora in its own browser tab (or install the app) to turn on alerts."}
        </p>
      </div>
      {state === "off" && (
        <button onClick={on} disabled={busy} className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold disabled:opacity-60">
          {busy ? "…" : "Turn on"}
        </button>
      )}
      {state === "on" && (
        <button onClick={off} disabled={busy} className="rounded-full border border-border px-4 py-2 text-xs font-semibold">
          Turn off
        </button>
      )}
    </div>
  );
}
