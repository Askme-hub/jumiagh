import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Zap } from "lucide-react";

import { ProductCard } from "@/components/ProductCard";

import { useProducts } from "@/lib/products";
import type { Product } from "@/lib/store";

import banner from "@/assets/banner-anniversary.jpg";

export const Route = createFileRoute("/")({
  component: Home,

  head: () => ({
    meta: [
      { title: "Kivora Ghana – Everything You Need" },
      {
        name: "description",
        content:
          "Shop electronics, fashion, groceries, beauty products and more on Kivora Ghana. Fast delivery, secure payments and amazing deals.",
      },
    ],
  }),
});

function Countdown() {
  const [t, setT] = useState({ h: 0, m: 6, s: 46 });

  useEffect(() => {
    const i = setInterval(() => {
      setT((p) => {
        let s = p.s - 1;
        let m = p.m;
        let h = p.h;
        if (s < 0) {
          s = 59;
          m--;
        }
        if (m < 0) {
          m = 59;
          h--;
        }
        if (h < 0) return { h: 0, m: 9, s: 59 };
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(i);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <span className="tabular-nums">
      {pad(t.h)}h : {pad(t.m)}m : {pad(t.s)}s
    </span>
  );
}

function Home() {
  const { data: products = [], isLoading } = useProducts();

  return (
    <div className="bg-background min-h-screen">
      {/* CALL BAR */}
      <div className="bg-primary py-2 text-center text-sm font-semibold text-primary-foreground">
        Kivora Support: 025 757 3471
      </div>

      {/* HERO */}
      <div className="px-3 pt-3">
        <div className="relative rounded-2xl overflow-hidden shadow-lg">
          <img
            src={banner}
            alt="Kivora anniversary sale banner"
            className="w-full aspect-[2/1] object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent p-4 flex flex-col justify-center">
            <div className="text-white">
              <p className="text-xs font-bold tracking-[0.25em] uppercase text-primary">
                KIVORA GHANA
              </p>
              <h1 className="text-3xl font-extrabold mt-2 leading-tight">
                Everything
                <br />
                You Need
              </h1>
              <span className="inline-block mt-4 bg-primary text-primary-foreground rounded-full px-5 py-2 text-xs font-bold shadow-lg">
                UP TO 70% OFF
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FLASH SALES */}
      <div className="mt-4 mx-3 bg-secondary text-secondary-foreground rounded-2xl p-4 flex items-center justify-between shadow-lg border border-primary/20">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground rounded-xl p-2 shadow-md">
            <Zap size={18} fill="currentColor" />
          </div>
          <div>
            <p className="font-bold text-lg leading-none">Kivora Flash Sales</p>
            <p className="text-[11px] mt-1 text-primary">
              TIME LEFT: <Countdown />
            </p>
          </div>
        </div>
        <Link to="/categories" className="text-sm font-semibold text-primary">
          See All
        </Link>
      </div>

      {/* FLASH PRODUCTS */}
      <div className="mt-3 overflow-x-auto scrollbar-none">
        <div className="flex gap-3 px-3 pb-2">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="min-w-[160px] max-w-[170px] aspect-[3/4] rounded-lg bg-foreground/10 animate-pulse"
                />
              ))
            : products.slice(0, 6).map((p: Product) => (
                <div key={p.id} className="min-w-[160px] max-w-[170px]">
                  <ProductCard product={p} />
                </div>
              ))}
        </div>
      </div>

      {/* RECOMMENDED */}
      <h2 className="px-3 mt-6 text-xl font-bold text-foreground">Recommended For You</h2>

      {isLoading ? (
        <div className="px-3 mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-lg bg-foreground/10 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm font-semibold text-foreground">No products yet</p>
          <p className="text-xs text-muted-foreground mt-1">Check back soon for new arrivals.</p>
        </div>
      ) : (
        <div className="px-3 mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {products.slice(0, 12).map((p: Product) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      <div className="h-8" />
    </div>
  );
}
