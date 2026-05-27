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
          "Kivora Ghana – Everything You Need",
      },

      {
        name: "description",
        content:
          "Shop electronics, fashion, groceries, beauty products and more on Kivora Ghana. Fast delivery, secure payments and amazing deals.",
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
      label: "Kivora Deals",
      bg: "bg-[#ff7a00]",
      fg: "text-white",
      sub: "Hot Offers",
    },

    {
      label: "Fast Delivery",
      bg: "bg-black",
      fg: "text-white",
      sub: "Express",
    },

    {
      label: "Help Center",
      bg: "bg-zinc-800",
      fg: "text-white",
      sub: "24/7",
    },

    {
      label: "Become Seller",
      bg: "bg-orange-600",
      fg: "text-white",
      sub: "Earn More",
    },
  ];

  return (
    <div className="bg-[#f5f5f5] min-h-screen">
      
      {/* SEARCH */}
      <SearchBar />

      {/* CALL BAR */}
      <div className="bg-[#ff7a00] py-2 text-center text-sm font-semibold text-white">
        Kivora Support: 025 757 3471
      </div>

      {/* HERO */}
      <div className="px-3 pt-3">
        <div className="relative rounded-2xl overflow-hidden shadow-lg">
          <img
            src={banner}
            alt="Kivora Banner"
            className="w-full aspect-[2/1] object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent p-4 flex flex-col justify-center">
            <div className="text-white">
              <p className="text-xs font-bold tracking-[0.25em] uppercase text-orange-400">
                KIVORA GHANA
              </p>

              <h1 className="text-3xl font-extrabold mt-2 leading-tight">
                Everything
                <br />
                You Need
              </h1>

              <span className="inline-block mt-4 bg-[#ff7a00] text-white rounded-full px-5 py-2 text-xs font-bold shadow-lg">
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
                  ? "w-5 bg-[#ff7a00]"
                  : "w-1.5 bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>

      {/* FLASH SALES */}
      <div className="mt-4 mx-3 bg-black text-white rounded-2xl p-4 flex items-center justify-between shadow-lg border border-orange-500/20">
        <div className="flex items-center gap-3">
          <div className="bg-[#ff7a00] rounded-xl p-2 shadow-md">
            <Zap
              size={18}
              fill="currentColor"
            />
          </div>

          <div>
            <p className="font-bold text-lg leading-none">
              Kivora Flash Sales
            </p>

            <p className="text-[11px] mt-1 opacity-90 text-orange-300">
              TIME LEFT: <Countdown />
            </p>
          </div>
        </div>

        <Link
          to="/categories"
          className="text-sm font-semibold text-orange-400"
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
            className={`${t.bg} ${t.fg} rounded-2xl aspect-square p-2 flex flex-col justify-between shadow-md`}
          >
            <p className="text-[10px] font-bold uppercase leading-tight">
              {t.sub}
            </p>

            <p className="text-[11px] font-semibold">
              {t.label}
            </p>
          </div>
        ))}
      </div>

      {/* RECOMMENDED */}
      <h2 className="px-3 mt-6 text-xl font-bold text-black">
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
