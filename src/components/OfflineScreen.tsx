import { WifiOff, RefreshCw, ShoppingCart } from "lucide-react";
import kivoraIcon from "@/assets/kivora-icon.png";

/** Full-screen branded fallback shown when a page can't load because the device is offline. */
export function OfflineScreen({ onRetry }: { onRetry?: () => void }) {
  const retry = () => (onRetry ? onRetry() : window.location.reload());
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-6 py-12">
      <div className="max-w-sm text-center">
        <div className="relative mx-auto mb-6 h-20 w-20">
          <img src={kivoraIcon} alt="Kivora" className="h-20 w-20 rounded-2xl shadow-lg" />
          <span className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full border-4 border-background bg-destructive text-destructive-foreground">
            <WifiOff size={16} />
          </span>
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground">You're offline</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Check your mobile data or Wi‑Fi. Your cart and recently viewed items are saved on this device.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={retry}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground active:scale-[0.98]"
          >
            <RefreshCw size={16} /> Retry connection
          </button>
          <a
            href="/cart"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground"
          >
            <ShoppingCart size={16} /> View my cart
          </a>
        </div>
      </div>
    </div>
  );
}
