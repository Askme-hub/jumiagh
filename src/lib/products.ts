import earbudsWhite from "@/assets/product-earbuds-white.jpg";
import earbudsBlack from "@/assets/product-earbuds-black.jpg";
import ac from "@/assets/product-ac.jpg";
import iem from "@/assets/product-iem.jpg";
import drone from "@/assets/product-drone.jpg";
import oil from "@/assets/cat-oil.jpg";
import noodles from "@/assets/cat-noodles.jpg";
import rice from "@/assets/cat-rice.jpg";
import type { Product } from "./store";

export const products: Product[] = [
  { id: "1", name: "BudsAir 5e Ultra Wireless Earbuds", price: 103, oldPrice: 169, image: earbudsWhite, stock: 10, discount: 39 },
  { id: "2", name: "TWS BudsAir 5i Earbuds - Black", price: 105, oldPrice: 128, image: earbudsBlack, stock: 22, discount: 18 },
  { id: "3", name: "1.5HP NAS-J12-N1-ECO Split AC - White", price: 2874, oldPrice: 4500, image: ac, stock: 1, discount: 36 },
  { id: "4", name: "Professional Wired In-Ear Monitor Earphones - Black", price: 390, oldPrice: 620, image: iem, stock: 14, discount: 37 },
  { id: "5", name: "Dji Mini 4 Pro Fly More Combo Plus - 42mins Drone", price: 18500, image: drone, stock: 3 },
  { id: "6", name: "Frytol Pure Cooking Oil 3L", price: 95, oldPrice: 120, image: oil, stock: 50, discount: 20 },
  { id: "7", name: "Indomie Chicken Noodles (Pack of 40)", price: 75, image: noodles, stock: 100 },
  { id: "8", name: "Royal Aroma Premium Rice 5kg", price: 140, oldPrice: 180, image: rice, stock: 30, discount: 22 },
];

export const findProduct = (id: string) => products.find((p) => p.id === id);
