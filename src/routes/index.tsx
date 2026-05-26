import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Zap } from "lucide-react";

import { SearchBar } from "@/components/SearchBar";
import { ProductCard } from "@/components/ProductCard";

import { useProducts } from "@/lib/products";
import type { Product } from "@/lib/store";

import banner from "@/assets/banner-anniversary.jpg";

export const Route = createFileRoute("/")({
  component: Home,

  head: () => ({
    meta: [
      {
        title:
          "Jumia Ghana – Online Shopping for Electronics, Fashion & More",
      },

      {
        name: "description",
        content:
          "Shop the best deals on phones, electronics, fashion, groceries and more on Jumia Ghana. Fast delivery, easy returns.",
      },
    ],
  }),
});

function Countdown() {
  const [t, setT] = useState({
    h: 0,
    m: 6,
    s: 46,
  });

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

        if (h < 0) {
          return {
            h: 0,
            m: 9,
            s: 59,
          };
        }

        return { h, m, s };
      });
    }, 1000);

    return () => clearInterval(i);
  }, []);

  const pad = (n: number) =>
    String(n).padStart(2, "0");

  return (
    <span className="tabular-nums">
      {pad(t.h)}h : {pad(t.m)}m : {pad(t.s)}s
    </span>
  );
}

function Home() {
  const { data: products = [] } = useProducts();

  const tiles = [
    {
      label: "Anniversary",
      bg: "bg-primary",
      fg: "text-primary-foreground",
      sub: "14 Years",
    },

    {
      label: "Delivery",
      bg: "bg-green-500",
      fg: "text-white",
      sub: "Fast Ship",
    },

    {
      label: "Help Center",
      bg: "bg-secondary",
      fg: "text-foreground",
      sub: "24/7",
    },

    {
      label: "Earn Cash",
      bg: "bg-orange-500",
      fg: "text-white",
      sub: "Join Force",
    },
  ];

  return (
    <div className="bg-[#f5f5f5] min-h-screen">
      
      {/* SEARCH */}
      <SearchBar />

      {/* CALL BAR */}
      <div className="bg-orange-500 py-2 text-center text-sm font-semibold text-white">
        Call to Order: 025 757 3471
      </div>

      {/* HERO */}
      <div className="px-3 pt-3">
        <div className="relative rounded-xl overflow-hidden shadow-sm">
          <img
            src={banner}
            alt="Banner"
            className="w-full aspect-[2/1] object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent p-4 flex flex-col justify-center">
            <div className="text-white">
              <p className="text-xs font-bold tracking-widest">
                JUMIA 14 YEARS
              </p>

              <h1 className="text-2xl font-bold mt-2 leading-tight">
                We've been
                <br />
                doing it
              </h1>

              <span className="inline-block mt-3 bg-white text-black rounded-full px-4 py-1 text-xs font-bold">
                UP TO 70% OFF
              </span>
            </div>
          </div>
        </div>

        {/* SLIDER DOTS */}
        <div className="flex justify-center gap-1.5 mt-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === 1
                  ? "w-5 bg-orange-500"
                  : "w-1.5 bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>

      {/* FLASH SALES */}
      <div className="mt-4 mx-3 bg-orange-500 text-white rounded-xl p-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 rounded-lg p-2">
            <Zap
              size={18}
              fill="currentColor"
            />
          </div>

          <div>
            <p className="font-bold text-lg leading-none">
              Flash Sales
            </p>

            <p className="text-[11px] mt-1 opacity-90">
              TIME LEFT: <Countdown />
            </p>
          </div>
        </div>

        <Link
          to="/categories"
          className="text-sm font-semibold"
        >
          See All
        </Link>
      </div>

      {/* FLASH PRODUCTS */}
      <div className="mt-3 overflow-x-auto scrollbar-none">
        <div className="flex gap-3 px-3 pb-2">
          {products.slice(0, 6).map((p: Product) => (
            <div
              key={p.id}
              className="min-w-[160px] max-w-[170px]"
            >
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>

      {/* QUICK TILES */}
      <div className="px-3 mt-5 grid grid-cols-4 gap-2">
        {tiles.map((t) => (
          <div
            key={t.label}
            className={`${t.bg} ${t.fg} rounded-xl aspect-square p-2 flex flex-col justify-between shadow-sm`}
          >
            <p className="text-[10px] font-bold uppercase leading-tight">
              JUMIA {t.sub}
            </p>

            <p className="text-[11px] font-semibold">
              {t.label}
            </p>
          </div>
        ))}
      </div>

      {/* RECOMMENDED */}
      <h2 className="px-3 mt-6 text-lg font-bold">
        Recommended For You
      </h2>

      <div className="px-3 mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {products.slice(0, 12).map((p: Product) => (
          <ProductCard
            key={p.id}
            product={p}
          />
        ))}
      </div>

      <div className="h-8" />
    </div>
  );
}
