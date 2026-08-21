import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useBanners } from "@/lib/banners";

export function BannerSlider() {
  const { data: banners = [], isLoading } = useBanners(true);
  const [i, setI] = useState(0);

  const count = banners.length;

  useEffect(() => {
    if (count < 2) return;
    const t = setInterval(() => setI((p) => (p + 1) % count), 5000);
    return () => clearInterval(t);
  }, [count]);

  useEffect(() => {
    if (i >= count) setI(0);
  }, [count, i]);

  if (isLoading) {
    return (
      <div className="px-4 pt-1">
        <div className="aspect-[16/10] w-full animate-pulse rounded-3xl bg-muted sm:aspect-[5/2]" />
      </div>
    );
  }

  if (count === 0) return null;

  const go = (n: number) => setI((n + count) % count);

  return (
    <div className="px-4 pt-1">
      <div className="group relative overflow-hidden rounded-3xl shadow-elevated">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${i * 100}%)` }}
        >
          {banners.map((b) => {
            const content = (
              <div className="relative w-full shrink-0">
                <img
                  src={b.image_url}
                  alt={b.title ?? "Promotional banner"}
                  className="aspect-[16/10] w-full object-cover sm:aspect-[5/2]"
                  loading="lazy"
                />
                {(b.title || b.subtitle || b.cta_label) && (
                  <div className="absolute inset-0 flex flex-col justify-center bg-gradient-to-r from-black/85 via-black/45 to-transparent p-5">
                    {b.title && (
                      <h2 className="max-w-[70%] text-2xl font-extrabold leading-tight text-white sm:text-3xl">
                        {b.title}
                      </h2>
                    )}
                    {b.subtitle && (
                      <p className="mt-2 max-w-[70%] text-xs font-medium text-white/85">
                        {b.subtitle}
                      </p>
                    )}
                    {b.cta_label && (
                      <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-full gradient-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-elevated">
                        {b.cta_label} <ChevronRight size={14} />
                      </span>
                    )}
                  </div>
                )}
              </div>
            );

            if (!b.link_url) {
              return (
                <div key={b.id} className="w-full shrink-0">
                  {content}
                </div>
              );
            }

            return (
              <a key={b.id} href={b.link_url} className="w-full shrink-0">
                {content}
              </a>
            );
          })}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous banner"
              onClick={() => go(i - 1)}
              className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-background/80 p-2 text-foreground shadow-soft transition hover:bg-background md:block"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="Next banner"
              onClick={() => go(i + 1)}
              className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-background/80 p-2 text-foreground shadow-soft transition hover:bg-background md:block"
            >
              <ChevronRight size={18} />
            </button>
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {banners.map((b, idx) => (
                <button
                  key={b.id}
                  type="button"
                  aria-label={`Go to banner ${idx + 1}`}
                  onClick={() => go(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === i ? "w-5 bg-primary" : "w-1.5 bg-white/60"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
