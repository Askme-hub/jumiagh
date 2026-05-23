import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import oil from "@/assets/cat-oil.jpg";
import noodles from "@/assets/cat-noodles.jpg";
import rice from "@/assets/cat-rice.jpg";
import earbuds from "@/assets/product-earbuds-white.jpg";
import ac from "@/assets/product-ac.jpg";

export const Route = createFileRoute("/categories")({
  component: Categories,
  head: () => ({ meta: [{ title: "Categories – Jumia Ghana" }] }),
});

const cats = [
  "Grocery", "Phones & Tablets", "Health & Beauty", "Home & Office",
  "Electronics", "Computing", "Fashion", "Sporting Goods",
  "Baby Products", "Gaming", "Automobile", "Books",
];

const groups: Record<string, { title: string; items: { img: string; label: string }[] }[]> = {
  Grocery: [
    {
      title: "Food Cupboard",
      items: [
        { img: oil, label: "Cooking Ingredients" },
        { img: noodles, label: "Pasta, Noodles & ..." },
        { img: rice, label: "Grains & Rice" },
      ],
    },
    {
      title: "Cooking & Baking",
      items: [
        { img: oil, label: "Flours & Meals" },
        { img: rice, label: "Syrups, Sugars & ..." },
      ],
    },
  ],
  Electronics: [
    {
      title: "Audio",
      items: [
        { img: earbuds, label: "Earbuds" },
        { img: earbuds, label: "Headphones" },
      ],
    },
    {
      title: "Cooling",
      items: [{ img: ac, label: "Air Conditioners" }, { img: ac, label: "Fans" }],
    },
  ],
};

function Categories() {
  const [active, setActive] = useState("Grocery");
  const sections = groups[active] ?? groups["Grocery"];
  return (
    <div>
      <SearchBar />
      <div className="flex border-t border-border" style={{ minHeight: "calc(100vh - 130px)" }}>
        <aside className="w-28 bg-muted shrink-0">
          {cats.map((c) => {
            const isActive = c === active;
            return (
              <button
                key={c}
                onClick={() => setActive(c)}
                className={`w-full text-left text-xs px-3 py-4 leading-tight border-l-[3px] ${
                  isActive ? "bg-background border-primary font-semibold" : "border-transparent text-foreground/70"
                }`}
              >
                {c}
              </button>
            );
          })}
        </aside>
        <div className="flex-1 p-3 space-y-3 bg-muted/50">
          <div className="bg-card rounded-md px-4 py-3 flex items-center justify-between">
            <p className="font-semibold">All Products</p>
            <ChevronRight size={20} />
          </div>
          {sections.map((s) => (
            <div key={s.title} className="bg-card rounded-md">
              <div className="px-4 pt-3 flex items-center justify-between">
                <p className="font-bold leading-tight">{s.title}</p>
                <button className="text-primary text-sm font-semibold">See All</button>
              </div>
              <div className="grid grid-cols-3 gap-2 p-3">
                {s.items.map((it, i) => (
                  <div key={i} className="text-center">
                    <div className="aspect-square bg-muted rounded overflow-hidden">
                      <img src={it.img} alt={it.label} loading="lazy" className="w-full h-full object-contain" />
                    </div>
                    <p className="text-[11px] mt-1 leading-tight">{it.label}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
