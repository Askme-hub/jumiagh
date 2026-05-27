import { useEffect, useState } from "react";
import {
  ShoppingBag,
  Sparkles,
} from "lucide-react";

export function Preloader({
  onDone,
}: {
  onDone?: () => void;
}) {
  const [progress, setProgress] =
    useState(0);

  const [fadeOut, setFadeOut] =
    useState(false);

  useEffect(() => {
    const totalDuration = 2200;

    const interval = 30;

    const step =
      100 / (totalDuration / interval);

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next =
          prev +
          step +
          Math.random() * step;

        if (next >= 100) {
          clearInterval(timer);

          setTimeout(() => {
            setFadeOut(true);

            setTimeout(() => {
              onDone?.();
            }, 500);
          }, 300);

          return 100;
        }

        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [onDone]);

  return (
    <div
      className={`
        fixed inset-0 z-[100]
        flex flex-col items-center justify-center
        bg-black overflow-hidden
        transition-all duration-500
        ${
          fadeOut
            ? "opacity-0 scale-110 pointer-events-none"
            : "opacity-100 scale-100"
        }
      `}
    >
      {/* BACKGROUND GLOW */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,122,0,0.15),transparent_60%)]" />

      {/* FLOATING ORBS */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-[#ff7a00]/10 rounded-full blur-3xl animate-pulse" />

      <div className="absolute bottom-20 right-10 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl animate-pulse" />

      {/* LOGO SECTION */}
      <div className="relative flex items-center justify-center">
        
        {/* OUTER RINGS */}
        <span className="absolute w-36 h-36 rounded-full border border-[#ff7a00]/20 animate-ping" />

        <span className="absolute w-28 h-28 rounded-full border border-[#ff7a00]/20 animate-pulse" />

        {/* GLOW */}
        <div className="absolute w-24 h-24 rounded-full bg-[#ff7a00]/20 blur-2xl" />

        {/* ICON */}
        <div
          className="
            relative z-10
            w-24 h-24 rounded-3xl
            bg-gradient-to-br from-[#ff7a00] to-orange-500
            shadow-[0_10px_40px_rgba(255,122,0,0.45)]
            flex items-center justify-center
            animate-bounce
          "
        >
          <ShoppingBag
            size={40}
            className="text-white"
            strokeWidth={2.4}
          />
        </div>

        {/* SMALL SPARK */}
        <Sparkles
          size={18}
          className="
            absolute -top-2 -right-2
            text-[#ffb067]
            animate-pulse
          "
        />
      </div>

      {/* BRAND */}
      <div className="mt-8 text-center">
        <h1
          className="
            text-white text-4xl font-black
            tracking-[0.3em]
            uppercase
          "
        >
          KIVORA
        </h1>

        <p className="text-orange-300 text-sm mt-2 tracking-[0.2em] uppercase">
          Everything You Need
        </p>
      </div>

      {/* PROGRESS */}
      <div className="mt-10 w-56">
        <div className="flex justify-between text-[10px] text-zinc-500 mb-2 uppercase tracking-widest">
          <span>Loading</span>
          <span>{Math.floor(progress)}%</span>
        </div>

        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="
              h-full rounded-full
              bg-gradient-to-r from-[#ff7a00] to-orange-400
              transition-all duration-200
            "
            style={{
              width: `${Math.min(
                progress,
                100
              )}%`,
            }}
          />
        </div>
      </div>

      {/* FOOTER TEXT */}
      <p className="mt-5 text-zinc-500 text-[11px] tracking-wide">
        Preparing your premium shopping experience...
      </p>
    </div>
  );
}
