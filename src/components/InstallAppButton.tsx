import { Download } from "lucide-react";
import { useInstallPrompt, setInstallSheetOpen } from "@/lib/pwa";

/**
 * Install button. variant="card" for homepage banner, variant="nav" for bottom nav pill.
 * Opens the shared install bottom sheet.
 */
export function InstallAppButton({ variant = "card" }: { variant?: "card" | "nav" }) {
  const { available, installed, isIOS } = useInstallPrompt();

  if (installed) return null;
  if (!available && !isIOS) return null;

  const onClick = () => setInstallSheetOpen(true);

  if (variant === "nav") {
    return (
      <button
        onClick={onClick}
        aria-label="Install Kivora app"
        className="flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[10px] font-semibold text-primary transition active:scale-95"
      >
        <Download size={21} strokeWidth={2.2} />
        Install
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 text-left transition hover:bg-primary/15 active:scale-[0.99]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-primary text-primary-foreground">
        <Download size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-foreground">Install the Kivora app</span>
        <span className="block text-xs text-muted-foreground">
          Faster shopping, full screen, right from your home screen.
        </span>
      </span>
      <span className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
        Install
      </span>
    </button>
  );
}
