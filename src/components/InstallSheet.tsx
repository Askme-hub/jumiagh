import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Bell, Zap, Wifi, Share, PlusSquare, X, Download } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import kivoraIcon from "@/assets/kivora-icon.png";
import {
  useInstallPrompt, useInstallSheet, bumpEngagement, recentlyDismissed,
  markInstallDismissed, ENGAGEMENT_THRESHOLD,
} from "@/lib/pwa";

const perks = [
  { icon: Zap, label: "Faster loading" },
  { icon: Bell, label: "Instant order alerts" },
  { icon: Wifi, label: "Less data used" },
];

/** Native-style bottom sheet for installing Kivora, auto-suggested once shoppers show intent. */
export function InstallSheet() {
  const { available, installed, isIOS, promptInstall } = useInstallPrompt();
  const [open, setOpen] = useInstallSheet();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const lastPath = useRef<string | null>(null);

  // Smart timing: count product page visits, suggest after the threshold.
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    if (!pathname.startsWith("/products/")) return;
    const n = bumpEngagement();
    if (installed || !(available || isIOS) || recentlyDismissed()) return;
    if (n >= ENGAGEMENT_THRESHOLD) {
      const t = setTimeout(() => setOpen(true), 2500);
      return () => clearTimeout(t);
    }
  }, [pathname, installed, available, isIOS, setOpen]);

  if (installed) return null;

  const close = () => {
    markInstallDismissed();
    setOpen(false);
  };

  const install = async () => {
    const res = await promptInstall();
    if (res !== "unavailable") setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <SheetContent side="bottom" className="z-[120] mx-auto max-h-[90vh] max-w-md overflow-y-auto rounded-t-3xl border-border bg-card px-6 pb-8 pt-6 [&>button]:hidden">
        <button onClick={close} aria-label="Close" className="absolute right-4 top-4 rounded-full bg-muted p-1.5 text-muted-foreground">
          <X size={16} />
        </button>
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted" />
        <div className="flex items-center gap-4">
          <img src={kivoraIcon} alt="" className="h-16 w-16 rounded-2xl shadow-md" />
          <div>
            <SheetTitle className="font-display text-xl text-foreground">Get the Kivora App</SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">Shop Ghana's marketplace from your home screen.</SheetDescription>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {perks.map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 rounded-2xl bg-primary/10 px-2 py-3 text-center">
              <Icon size={18} className="text-primary" />
              <span className="text-[11px] font-semibold leading-tight text-foreground">{label}</span>
            </div>
          ))}
        </div>

        {available ? (
          <button onClick={install} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground active:scale-[0.98]">
            <Download size={18} /> Install — it's free
          </button>
        ) : isIOS ? (
          <ol className="mt-6 space-y-3">
            <li className="flex items-center gap-3 rounded-2xl border border-border p-3 text-sm text-foreground">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
              Tap the <Share size={16} className="text-primary" /> <b>Share</b> button in Safari
            </li>
            <li className="flex items-center gap-3 rounded-2xl border border-border p-3 text-sm text-foreground">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span>
              Choose <PlusSquare size={16} className="text-primary" /> <b>Add to Home Screen</b>
            </li>
          </ol>
        ) : (
          <p className="mt-6 text-center text-sm text-muted-foreground">Open Kivora in Chrome or Safari to install the app.</p>
        )}

        <button onClick={close} className="mt-3 w-full py-2 text-sm font-medium text-muted-foreground">Not now</button>
      </SheetContent>
    </Sheet>
  );
}
