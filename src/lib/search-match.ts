import type { Product } from "@/lib/store";

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019\u02bc`´]/g, "'")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/'s\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stem(w: string): string {
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 3 && w.endsWith("es") && /(sh|ch|x|s)es$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

/** Score a product for a query; 0 = no match. Every query word must appear somewhere. */
export function scoreProduct(p: Product, query: string): number {
  const words = normalize(query).split(" ").filter(Boolean).map(stem);
  if (!words.length) return 0;
  const name = normalize(p.name);
  const nameJoined = name.replace(/ /g, "");
  const cat = normalize(p.category ?? "");
  const desc = normalize(p.description ?? "");
  let score = 0;
  for (const w of words) {
    if (name.includes(w) || nameJoined.includes(w)) score += 3;
    else if (cat.includes(w)) score += 2;
    else if (desc.includes(w)) score += 1;
    else return 0;
  }
  if (name.startsWith(words[0])) score += 1;
  return score;
}

export function searchProducts(products: Product[], query: string): Product[] {
  return products
    .map((p) => ({ p, s: scoreProduct(p, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p);
}
