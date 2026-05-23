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
      { title: "Jumia Ghana – Online Shopping for Electronics, Fashion & More" },
      { name: "description", content: "Shop the best deals on phones, electronics, fashion, groceries and more on Jumia Ghana. Fast delivery, easy returns." },
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
        if (s < 0) { s = 59; m--; }
        if (m < 0) { m = 59; h--; }
        if (h < 0) return { h: 0, m: 9, s: 59 };
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(i);
  }, []);
  const pad = (n: number) => String(n).padStart(2, "0");
  return <span className="tabular-nums">{pad(t.h)}h : {pad(t.m)}m : {pad(t.s)}s</span>;
}

function Home() {
  const { data: products = [] } = useProducts();
  const tiles = [
    { label: "Anniversary", bg: "bg-primary", fg: "text-primary-foreground", sub: "14 Years" },
    { label: "Delivery", bg: "bg-success", fg: "text-white", sub: "Fast Ship" },
    { label: "Help Center", bg: "bg-secondary", fg: "text-foreground", sub: "24/7" },
    { label: "Earn Cash", bg: "bg-primary", fg: "text-primary-foreground", sub: "Join Force" },
  ];
  return (
    <div>
      <SearchBar />
      <div className="bg-accent py-2 text-center text-sm font-semibold">
        Call to Order: 030 274 0642
      </div>

      <div className="px-3 pt-3">
        <div className="relative rounded-lg overflow-hidden">
          <img src={banner} alt="14th Anniversary Sale - Up to 70% OFF" className="w-full aspect-[2/1] object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/40 to-transparent p-4 flex flex-col justify-between">
            <div className="text-primary-foreground">
              <p className="text-xs font-bold tracking-wider">JUMIA 14 YEARS</p>
              <p className="text-lg font-bold leading-tight mt-1">We've been<br/>doing it</p>
              <span className="inline-block mt-2 bg-background text-foreground rounded-full px-3 py-1 text-xs font-bold">
                UP TO 70% OFF
              </span>
            </div>
          </div>
        </div>
        <div className="flex justify-center gap-1.5 mt-2">
          {[0,1,2,3,4].map((i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === 1 ? "w-4 bg-primary" : "w-1.5 bg-muted"}`} />
          ))}
        </div>
      </div>

      <div className="mt-4 mx-3 bg-flash text-white rounded-md p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-white/20 rounded p-1.5"><Zap size={20} fill="currentColor" /></div>
          <div>
            <p className="font-bold text-lg leading-none">Flash Sales</p>
            <p className="text-[11px] mt-1 opacity-90">TIME LEFT: <Countdown /></p>
          </div>
        </div>
        <Link to="/categories" className="text-sm font-semibold">See All</Link>
      </div>

      <div className="mt-3 overflow-x-auto scrollbar-none">
        <div className="flex gap-3 px-3 pb-2">
  {products.slice(0, 5).map((p: Product) => (
    <div
      key={p.id}
      className="min-w-[180px] max-w-[220px]"
    >
      <ProductCard product={p} />
    </div>
  ))}
</div>
      </div>

      <div className="px-3 mt-5 grid grid-cols-4 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className={`${t.bg} ${t.fg} rounded-md aspect-square p-2 flex flex-col justify-between`}>
            <p className="text-[10px] font-bold uppercase leading-tight">JUMIA {t.sub}</p>
            <p className="text-[11px] font-semibold">{t.label}</p>
          </div>
        ))}
      </div>

      <h2 className="px-3 mt-6 text-base font-bold">Recommended For You</h2>
     <div className="flex gap-3 px-3 pb-2">
  {products.slice(0, 5).map((p: Product) => (
    <div
      key={p.id}
      className="min-w-[180px] max-w-[220px]"
    >
      <ProductCard product={p} />
    </div>
  ))}
</div>
        ))}
      </div>
      <div className="h-6" />
    </div>
  );
}
