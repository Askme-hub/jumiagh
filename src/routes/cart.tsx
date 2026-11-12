import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Minus, Plus, Trash2, Truck, ShoppingBag, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { formatGHC, useShop, type Product } from "@/lib/store";
import { useProducts } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/cart")({
  component: Cart,
  head: () => ({
    meta: [
      { title: "Your Cart – Kivora Ghana" },
      { name: "description", content: "Review the items in your Kivora Ghana cart and check out securely." },
      { property: "og:title", content: "Your Cart – Kivora Ghana" },
      { property: "og:description", content: "Review the items in your Kivora Ghana cart and check out securely." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function Cart() {
  const router = useRouter();
  const cart = useShop((s) => s.cart);
  const updateQty = useShop((s) => s.updateQty);
  const removeFromCart = useShop((s) => s.removeFromCart);
  const total = useShop((s) => s.cartTotal());
  const { data: products = [] } = useProducts();
  const [going, setGoing] = useState(false);
  const itemCount = cart.reduce((a, c) => a + c.qty, 0);
  const inCart = new Set(cart.map((c) => c.product.id));
  const suggestions = products.filter((p: Product) => !inCart.has(p.id) && (p.stock ?? 0) > 0).slice(0, 6);

  const checkout = async () => {
    if (cart.length === 0) return;
    setGoing(true);
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      toast.error("Please log in to checkout");
      router.navigate({ to: "/login" });
      setGoing(false);
      return;
    }
    router.navigate({ to: "/checkout" });
  };

  return (
    <div className="pb-56 md:pb-10">
      <PageHeader title="Cart" />

      <div className="mx-auto max-w-2xl px-4 pt-3">
        {cart.length > 0 && (
          <div className="mb-3 flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Cart summary · Subtotal</span>
            <span className="text-lg font-extrabold text-foreground">{formatGHC(total)}</span>
          </div>
        )}
        <Link to="/shipping" className="flex items-center gap-3 rounded-2xl bg-muted px-4 py-3">
          <Truck size={18} className="shrink-0 text-primary" />
          <span className="flex-1 text-sm font-medium text-foreground">Delivery fees are calculated by region at checkout</span>
          <ChevronRight size={16} className="text-muted-foreground" />
        </Link>

        {cart.length === 0 ? (
          <div className="py-16 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <ShoppingBag size={26} className="text-muted-foreground" />
            </span>
            <p className="mt-4 text-lg font-bold text-foreground">Your cart is empty</p>
            <p className="mt-1 text-sm text-muted-foreground">Browse products and add your favourites here.</p>
            <Link to="/" className="mt-5 inline-block rounded-2xl bg-primary px-6 py-3 font-bold text-primary-foreground">
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="mt-4 rounded-3xl bg-card p-2">
            <p className="px-2 pb-1 pt-2 text-sm font-semibold text-muted-foreground">
              {itemCount} item{itemCount === 1 ? "" : "s"}
            </p>
            {cart.map(({ product, qty }, i) => {
              const atMax = product.stock != null && qty >= product.stock;
              return (
                <div key={product.id} className={`flex gap-3 p-2 py-3 ${i > 0 ? "border-t border-border" : ""}`}>
                  <Link to="/products/$id" params={{ id: product.id }} className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-muted">
                    <img src={product.image} alt={product.name} loading="lazy" className="h-full w-full object-contain p-2 mix-blend-multiply dark:mix-blend-normal" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start gap-2">
                      <p className="line-clamp-2 flex-1 text-sm font-medium leading-snug text-foreground">{product.name}</p>
                      <button
                        onClick={() => removeFromCart(product.id)}
                        className="-mr-1 -mt-1 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                        aria-label={`Remove ${product.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    {product.stock != null && product.stock <= 5 && (
                      <p className="mt-0.5 text-[11px] font-semibold text-flash">Only {product.stock} left</p>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div>
                        <p className="font-extrabold text-foreground">{formatGHC(product.price)}</p>
                        {product.oldPrice ? (
                          <p className="text-[11px] text-muted-foreground line-through">{formatGHC(product.oldPrice)}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQty(product.id, qty - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-foreground active:scale-95"
                          aria-label="Decrease"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-5 text-center text-sm font-semibold text-foreground">{qty}</span>
                        <button
                          disabled={atMax}
                          onClick={() => {
                            const ok = updateQty(product.id, qty + 1);
                            if (!ok) toast.error(`Only ${product.stock} in stock`);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-foreground active:scale-95 disabled:opacity-40"
                          aria-label="Increase"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {suggestions.length > 0 && (
          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">You may also like</h2>
              <Link to="/wishlist" className="text-xs font-medium text-muted-foreground">Wishlist</Link>
            </div>
            <div className="-mx-4 overflow-x-auto scrollbar-none">
              <div className="flex gap-3 px-4 pb-2">
                {suggestions.map((p: Product) => (
                  <div key={p.id} className="w-[150px] shrink-0"><ProductCard product={p} /></div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-[84px] left-0 right-0 z-40 border-t border-border bg-card px-4 py-3 md:static md:mx-auto md:mt-6 md:max-w-2xl md:rounded-3xl md:border">
          <div className="mx-auto max-w-2xl">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-lg font-extrabold text-foreground">{formatGHC(total)}</span>
            </div>
            <button
              onClick={checkout}
              disabled={going}
              className="w-full rounded-2xl bg-primary py-3.5 font-bold text-primary-foreground transition active:scale-[0.98] disabled:opacity-60"
            >
              {going ? "Loading…" : "Checkout"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
