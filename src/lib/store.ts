import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Product = {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  image: string;
  stock?: number;
  discount?: number;
};

type Store = {
  cart: { product: Product; qty: number }[];
  wishlist: Product[];
  addToCart: (p: Product) => void;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  toggleWishlist: (p: Product) => void;
  isWishlisted: (id: string) => boolean;
  cartCount: () => number;
  cartTotal: () => number;
};

export const useShop = create<Store>()(
  persist(
    (set, get) => ({
      cart: [],
      wishlist: [],
      addToCart: (p) =>
        set((s) => {
          const existing = s.cart.find((c) => c.product.id === p.id);
          if (existing)
            return {
              cart: s.cart.map((c) =>
                c.product.id === p.id ? { ...c, qty: c.qty + 1 } : c
              ),
            };
          return { cart: [...s.cart, { product: p, qty: 1 }] };
        }),
      removeFromCart: (id) =>
        set((s) => ({ cart: s.cart.filter((c) => c.product.id !== id) })),
      updateQty: (id, qty) =>
        set((s) => ({
          cart:
            qty <= 0
              ? s.cart.filter((c) => c.product.id !== id)
              : s.cart.map((c) => (c.product.id === id ? { ...c, qty } : c)),
        })),
      toggleWishlist: (p) =>
        set((s) => ({
          wishlist: s.wishlist.find((w) => w.id === p.id)
            ? s.wishlist.filter((w) => w.id !== p.id)
            : [...s.wishlist, p],
        })),
      isWishlisted: (id) => !!get().wishlist.find((w) => w.id === id),
      cartCount: () => get().cart.reduce((a, c) => a + c.qty, 0),
      cartTotal: () =>
        get().cart.reduce((a, c) => a + c.product.price * c.qty, 0),
    }),
    { name: "jumia-shop" }
  )
);

export const formatGHC = (n: number) =>
  `GH₵ ${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
