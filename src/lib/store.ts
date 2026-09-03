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
  sellerId?: string;
  category?: string;
  description?: string;
};

type Store = {
  cart: { product: Product; qty: number }[];
  wishlist: Product[];
  addToCart: (p: Product, qty?: number) => boolean;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, qty: number) => boolean;
  syncStock: (stocks: Record<string, number>) => void;
  clearCart: () => void;
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
      addToCart: (p, qty = 1) => {
        const s = get();
        const max = p.stock ?? Infinity;
        if (max <= 0) return false;
        const existing = s.cart.find((c) => c.product.id === p.id);
        const desired = (existing?.qty ?? 0) + qty;
        const next = Math.min(desired, max);
        set({
          cart: existing
            ? s.cart.map((c) =>
                c.product.id === p.id ? { product: p, qty: next } : c
              )
            : [...s.cart, { product: p, qty: next }],
        });
        return next === desired;
      },
      removeFromCart: (id) =>
        set((s) => ({ cart: s.cart.filter((c) => c.product.id !== id) })),
      updateQty: (id, qty) => {
        const s = get();
        const item = s.cart.find((c) => c.product.id === id);
        if (!item) return false;
        if (qty <= 0) {
          set({ cart: s.cart.filter((c) => c.product.id !== id) });
          return true;
        }
        const max = item.product.stock ?? Infinity;
        const next = Math.min(qty, max);
        set({
          cart: s.cart.map((c) => (c.product.id === id ? { ...c, qty: next } : c)),
        });
        return next === qty;
      },
      syncStock: (stocks) =>
        set((s) => ({
          cart: s.cart.flatMap((c) => {
            const stock = stocks[c.product.id];
            if (stock === undefined) return [c];
            if (stock <= 0) return [];
            return [
              {
                product: { ...c.product, stock },
                qty: Math.min(c.qty, stock),
              },
            ];
          }),
        })),
      clearCart: () => set({ cart: [] }),
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
  `GH₵ ${Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
