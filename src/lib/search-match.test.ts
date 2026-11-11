import { describe, it, expect } from "vitest";
import { searchProducts } from "./search-match";
const P = [
  { id: "1", name: "oraimo PowerNova L21 20000mAh 30W Power Bank", price: 1, image: "", category: "Electronics" },
  { id: "2", name: "Google Pixel 8", price: 1, image: "", category: "Phones & Tablets" },
  { id: "3", name: "Men’s sneakers", price: 1, image: "", category: "Fashion", description: "Comfy" },
  { id: "4", name: "Speaker", price: 1, image: "", description: "Wireless bluetooth audio" },
];
const ids = (q: string) => searchProducts(P, q).map((p) => p.id);
describe("search", () => {
  it("matches words in any order", () => expect(ids("oraimo power bank")).toEqual(["1"]));
  it("matches category and plurals", () => expect(ids("phones")).toEqual(["2"]));
  it("matches singular to category", () => expect(ids("phone")).toEqual(["2"]));
  it("matches description", () => expect(ids("bluetooth")).toEqual(["4"]));
  it("treats apostrophes alike", () => expect(ids("men's sneakers")).toEqual(["3"]));
  it("requires every word", () => expect(ids("pixel sneakers")).toEqual([]));
});
