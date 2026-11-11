import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export function ProductGallery({ images, alt, overlay }: { images: string[]; alt: string; overlay?: React.ReactNode }) {
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);
  const startX = useRef<number | null>(null);
  const n = images.length;
  const go = (d: number) => setI((v) => (v + d + n) % n);
  const swipe = {
    onTouchStart: (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; },
    onTouchEnd: (e: React.TouchEvent) => {
      if (startX.current == null || n < 2) return;
      const dx = e.changedTouches[0].clientX - startX.current;
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      startX.current = null;
    },
  };
  if (!n) return <div className="aspect-square bg-muted" />;
  return (
    <>
      <div className="relative aspect-square bg-muted lg:aspect-[4/3]" {...swipe}>
        <button type="button" onClick={() => setOpen(true)} className="h-full w-full" aria-label="View full screen">
          <img src={images[i]} alt={alt} className="h-full w-full object-contain p-8 mix-blend-multiply dark:mix-blend-normal" />
        </button>
        {n > 1 && (
          <>
            <button type="button" aria-label="Previous photo" onClick={() => go(-1)} className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-card/90 p-2 shadow md:block"><ChevronLeft size={18} /></button>
            <button type="button" aria-label="Next photo" onClick={() => go(1)} className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-card/90 p-2 shadow md:block"><ChevronRight size={18} /></button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {images.map((_, k) => (
                <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? "w-5 bg-primary" : "w-1.5 bg-foreground/30"}`} />
              ))}
            </div>
            <span className="absolute bottom-3 right-3 rounded-full bg-card/90 px-2 py-0.5 text-[11px] font-semibold">{i + 1}/{n}</span>
          </>
        )}
        {overlay}
      </div>
      {n > 1 && (
        <div className="flex gap-2 overflow-x-auto px-3 py-2">
          {images.map((img, k) => (
            <button key={k} type="button" onClick={() => setI(k)} className={`h-16 w-16 shrink-0 overflow-hidden rounded border-2 bg-muted ${k === i ? "border-primary" : "border-border"}`}>
              <img src={img} alt="" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-foreground/95" {...swipe}>
          <div className="flex items-center justify-between p-4 text-background">
            <span className="text-sm font-semibold">{i + 1} / {n}</span>
            <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="rounded-full bg-background/15 p-2"><X size={20} /></button>
          </div>
          <div className="relative flex flex-1 items-center justify-center overflow-auto">
            <img src={images[i]} alt={alt} className="max-h-full max-w-full object-contain" />
            {n > 1 && (
              <>
                <button type="button" aria-label="Previous photo" onClick={() => go(-1)} className="absolute left-3 rounded-full bg-background/20 p-3 text-background"><ChevronLeft /></button>
                <button type="button" aria-label="Next photo" onClick={() => go(1)} className="absolute right-3 rounded-full bg-background/20 p-3 text-background"><ChevronRight /></button>
              </>
            )}
          </div>
          {n > 1 && (
            <div className="flex justify-center gap-2 overflow-x-auto p-3">
              {images.map((img, k) => (
                <button key={k} type="button" onClick={() => setI(k)} className={`h-14 w-14 shrink-0 overflow-hidden rounded border-2 bg-background ${k === i ? "border-primary" : "border-transparent opacity-60"}`}>
                  <img src={img} alt="" className="h-full w-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
