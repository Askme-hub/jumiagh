import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";

export function Preloader({ onDone }: { onDone?: () => void }) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const totalDuration = 2000;
    const interval = 30;
    const step = 100 / (totalDuration / interval);

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step + Math.random() * step;
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            setFadeOut(true);
            setTimeout(() => onDone?.(), 400);
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
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-primary transition-opacity duration-400 ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Cart icon with beeping rings */}
      <div className="relative flex items-center justify-center">
        {/* Outer ring wave */}
        <span className="absolute w-24 h-24 rounded-full border-2 border-white/20 animate-cart-ring-1" />
        <span className="absolute w-24 h-24 rounded-full border-2 border-white/20 animate-cart-ring-2" />
        <span className="absolute w-24 h-24 rounded-full border-2 border-white/20 animate-cart-ring-3" />

        {/* Inner pulsing circle */}
        <span className="absolute w-16 h-16 rounded-full bg-white/10 animate-cart-pulse" />

        {/* Cart icon */}
        <div className="relative z-10 w-16 h-16 rounded-full bg-white flex items-center justify-center animate-cart-bounce">
          <ShoppingCart size={28} className="text-primary" strokeWidth={2.2} />
        </div>
      </div>

      {/* Brand name */}
      <h1 className="mt-6 text-white text-xl font-bold tracking-wider">
        JUMIA
      </h1>
      <p className="text-white/70 text-xs mt-1 tracking-wide">Ghana</p>

      {/* Progress bar */}
      <div className="mt-8 w-48 h-1 bg-white/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-white rounded-full transition-all duration-100 ease-out"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {/* Loading text */}
      <p className="text-white/60 text-[11px] mt-3 tracking-wide">
        Loading your shopping experience…
      </p>
    </div>
  );
}
