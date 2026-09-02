import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/** Shows a slim bar when the device loses its connection. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed bottom-24 left-1/2 z-[90] -translate-x-1/2 md:bottom-6">
      <div className="flex items-center gap-2 rounded-full bg-foreground/90 px-4 py-2 text-xs font-medium text-background shadow-lg">
        <WifiOff className="h-3.5 w-3.5" />
        You're offline — browsing saved pages
      </div>
    </div>
  );
}
