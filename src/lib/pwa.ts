import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: BeforeInstallPromptEvent | null = null;

// ---- Install sheet open state (shared, tiny pub/sub) ----
let sheetOpen = false;
const sheetListeners = new Set<(open: boolean) => void>();
export function setInstallSheetOpen(open: boolean) {
  sheetOpen = open;
  sheetListeners.forEach((l) => l(open));
}
export function useInstallSheet() {
  const [open, setOpen] = useState(sheetOpen);
  useEffect(() => {
    sheetListeners.add(setOpen);
    return () => void sheetListeners.delete(setOpen);
  }, []);
  return [open, setInstallSheetOpen] as const;
}

// ---- Smart timing: count engagement, auto-suggest once intent is high ----
const ENGAGE_KEY = "kivora_pwa_engagement";
const DISMISS_KEY = "kivora_pwa_dismissed_at";
const DISMISS_DAYS = 7;
export const ENGAGEMENT_THRESHOLD = 2;

export function recentlyDismissed() {
  const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
  return Date.now() - at < DISMISS_DAYS * 86400_000;
}
export function markInstallDismissed() {
  localStorage.setItem(DISMISS_KEY, String(Date.now()));
}
/** Records one engagement signal (product view / add to cart); returns the new count. */
export function bumpEngagement() {
  const n = Number(localStorage.getItem(ENGAGE_KEY) || 0) + 1;
  localStorage.setItem(ENGAGE_KEY, String(n));
  return n;
}

/** Tracks PWA installability and exposes a prompt() to trigger the native install dialog. */
export function useInstallPrompt() {
  const [available, setAvailable] = useState(!!deferred);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (window.navigator as any).standalone === true;
    setInstalled(!!standalone);
    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent) && !standalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferred = e as BeforeInstallPromptEvent;
      setAvailable(true);
    };
    const onInstalled = () => {
      deferred = null;
      setAvailable(false);
      setInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!deferred) return "unavailable";
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") {
      deferred = null;
      setAvailable(false);
    }
    return outcome;
  };

  return { available, installed, isIOS, promptInstall };
}
