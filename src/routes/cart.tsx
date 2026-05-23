import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Phone, Minus, Plus, CheckCircle2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/PageHeader";
import { formatGHC, useShop, type Product } from "@/lib/store";
import { useProducts } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { initiatePaystackCheckout } from "@/lib/paystack.functions";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/cart")({
  component: Cart,
  head: () => ({ meta: [{ title: "Cart – Jumia Ghana" }] }),
});

function Cart() {
  const router = useRouter();
  const cart = useShop((s) => s.cart);
  const updateQty = useShop((s) => s.updateQty);
  const removeFromCart = useShop((s) => s.removeFromCart);
  const clearCart = useShop((s) => s.clearCart);
  const total = useShop((s) => s.cartTotal());
  const { data: products = [] } = useProducts();
  const [placing, setPlacing] = useState(false);
  const initCheckout = useServerFn(initiatePaystackCheckout);

  const checkout = async () => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      toast.error("Please log in to checkout");
      router.navigate({ to: "/login" });
      return;
    }
    if (cart.length === 0) return;
    setPlacing(true);
    try {
      const res = await initCheckout({
        data: {
          callbackOrigin: window.location.origin,
          items: cart.map((c) => ({
            product_id: c.product.id,
            name: c.product.name,
            price: Number(c.product.price),
            old_price: c.product.oldPrice ?? null,
            image_url: c.product.image ?? null,
            qty: c.qty,
          })),
        },
      });
      clearCart();
      window.location.href = res.authorization_url;
    } catch (e: any) {
      toast.error(e.message ?? "Checkout failed");
      setPlacing(false);
    }
  };



  return (
    <div>
      <PageHeader title="Cart" />
      <div className="bg-muted px-4 py-3 text-xs font-bold uppercase text-muted-foreground tracking-wider">
        Cart Summary
      </div>
      <div className="bg-card px-4 py-3 flex justify-between items-center">
        <span className="font-semibold">Subtotal</span>
        <span className="font-bold text-lg">{formatGHC(total)}</span>
      </div>
      <div className="px-4 py-3 flex gap-2 items-start text-sm border-t border-border">
        <CheckCircle2 size={20} className="text-success shrink-0 mt-0.5" />
        <p>
          Save up to GHC 50 on Your Delivery Fee for Orders above GHC 150. Prepaid only! (Everywhere In Ghana){" "}
          <span className="font-bold text-primary">JUMIA EXPRESS</span>
        </p>
      </div>

      <div className="bg-muted px-4 py-2 text-sm font-semibold">Cart ({cart.length})</div>

      {cart.length === 0 ? (
        <div className="px-4 py-10 text-center text-muted-foreground text-sm">
          Your cart is empty.{" "}
          <Link to="/" className="text-primary font-semibold">Continue shopping</Link>
        </div>
      ) : (
        cart.map(({ product, qty }) => (
          <div key={product.id} className="bg-card border-b border-border p-3 flex gap-3">
            <div className="w-20 h-20 bg-muted rounded shrink-0">
              <img src={product.image} alt={product.name} loading="lazy" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm line-clamp-2 leading-tight">{product.name}</p>
              <p className="font-bold mt-1">{formatGHC(product.price)}</p>
              {product.oldPrice && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="line-through text-muted-foreground">{formatGHC(product.oldPrice)}</span>
                  {product.discount && (
                    <span className="bg-primary-soft text-accent-foreground font-semibold px-1.5 py-0.5 rounded">
                      -{product.discount}%
                    </span>
                  )}
                </div>
              )}
              {product.stock != null && product.stock <= 5 && (
                <p className="text-destructive text-xs mt-1 font-semibold">⚠ {product.stock} units left</p>
              )}
              <div className="flex items-center justify-between mt-2">
                <button
                  onClick={() => removeFromCart(product.id)}
                  className="text-primary text-sm font-semibold"
                >
                  Remove
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQty(product.id, qty - 1)}
                    className="w-8 h-8 rounded bg-primary-soft text-foreground flex items-center justify-center"
                    aria-label="Decrease"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-6 text-center font-semibold">{qty}</span>
                  <button
                    onClick={() => updateQty(product.id, qty + 1)}
                    className="w-8 h-8 rounded bg-primary-soft text-foreground flex items-center justify-center"
                    aria-label="Increase"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))
      )}

      {cart.length > 0 && (
        <div className="px-3 py-3 flex gap-2 items-stretch">
          <button className="border-2 border-primary rounded-md w-14 flex items-center justify-center text-primary" aria-label="Call">
            <Phone size={20} />
          </button>
          <button onClick={checkout} disabled={placing} className="flex-1 bg-primary text-primary-foreground font-bold py-3.5 rounded-md disabled:opacity-60">
            {placing ? "Redirecting…" : `Pay with Paystack (${formatGHC(total)})`}
          </button>
        </div>
      )}

      <div className="bg-muted px-4 py-3 mt-2 flex items-center justify-between">
        <p className="font-bold">Wishlist ({useShop.getState().wishlist.length})</p>
        <Link to="/wishlist" className="text-primary text-sm font-semibold">See All</Link>
      </div>
      <div className="overflow-x-auto scrollbar-none">
        <div className="flex gap-3 px-3 py-3">
          {products.slice(3, 6).map((p: Product) => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
      <div className="h-6" />
    </div>
  );
}
