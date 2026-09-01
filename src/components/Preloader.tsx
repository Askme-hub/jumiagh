import { useEffect, useState } from "react";
import kivoraIcon from "@/assets/kivora-icon.png";

export function Preloader({ onDone }: { onDone?: () => void }) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const totalDuration = 1600;
    const interval = 30;
    const step = 100 / (totalDuration / interval);

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step;
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            setFadeOut(true);
            setTimeout(() => onDone?.(), 350);
          }, 200);
          return 100;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-300 ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center p-3">
            <img
              src={kivoraIcon}
              alt="Kivora"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-[0.2em] text-foreground uppercase">
            KIVORA
          </h1>
          <p className="text-xs text-muted-foreground tracking-wide">
            Everything You Need
          </p>
        </div>

        <div className="w-44 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-[width] duration-75 ease-linear rounded-full"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
