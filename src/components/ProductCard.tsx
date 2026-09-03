import { Product, formatGHC, useShop } from "@/lib/store";
import { Heart, Star, Minus, Plus, Truck, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

export function ProductCard({ product }: { product: Product }) {
  const addToCart = useShop((s) => s.addToCart);
  const updateQty = useShop((s) => s.updateQty);
  const toggleWishlist = useShop((s) => s.toggleWishlist);

  const cartItem = useShop((s) => s.cart.find((c) => c.product.id === product.id));
  const qty = cartItem?.qty ?? 0;
  const wished = useShop((s) => s.wishlist.some((w) => w.id === product.id));

  const oldPrice =
    product.oldPrice ??
    (product.discount ? product.price + (product.price * product.discount) / 100 : null);
  const saving = oldPrice ? oldPrice - product.price : 0;

  const stock = product.stock ?? 0;
  const outOfStock = stock <= 0;
  const lowStock = !outOfStock && stock <= 5;
  const atMax = qty >= stock;


  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border/60 bg-card text-card-foreground shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated">
      {/* IMAGE */}
      <Link
        to="/products/$id"
        params={{ id: product.id }}
        className="relative m-2 block aspect-square overflow-hidden rounded-2xl bg-muted/50"
      >
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-105"
        />

        {product.discount && (
          <div className="absolute left-2 top-2 rounded-full bg-flash px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-flash-foreground shadow">
            -{product.discount}%
          </div>
        )}

        <button
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(product);
            toast.success(wished ? "Removed from wishlist" : "Added to wishlist");
          }}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wished}
          className={`absolute right-2 top-2 rounded-full p-2 shadow-soft backdrop-blur transition ${
            wished
              ? "bg-primary text-primary-foreground"
              : "bg-card/90 text-foreground hover:bg-primary hover:text-primary-foreground"
          }`}
        >
          <Heart size={15} fill={wished ? "currentColor" : "none"} />
        </button>

      </Link>


      {/* CONTENT */}
      <div className="flex flex-1 flex-col px-3 pb-3 pt-1">
        <h3 className="line-clamp-2 min-h-[40px] text-sm font-semibold leading-5 text-foreground">
          {product.name}
        </h3>

        <div className="mt-1.5 flex items-center gap-1">
          <div className="flex text-warning">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} size={11} fill="currentColor" strokeWidth={0} />
            ))}
          </div>
          <span className="text-[11px] font-medium text-muted-foreground">4.9</span>
          <span className="text-[10px] text-muted-foreground/70">(24)</span>
        </div>

        {product.stock ? (
          <p className="mt-1.5 text-[11px] font-semibold text-primary">
            Only {product.stock} left
          </p>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold text-foreground">
              {formatGHC(product.price)}
            </p>
            {oldPrice && (
              <p className="truncate text-xs text-muted-foreground line-through">
                {formatGHC(oldPrice)}
              </p>
            )}
          </div>

          {qty === 0 ? (
            <button
              onClick={() => {
                addToCart(product);
                toast.success(`${product.name} added to cart`);
              }}
              aria-label={`Add ${product.name} to cart`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full gradient-primary text-primary-foreground shadow-soft transition active:scale-95"
            >
              <Plus size={18} strokeWidth={2.6} />
            </button>
          ) : (
            <div className="flex shrink-0 items-center gap-1 rounded-full bg-primary-soft p-1">
              <button
                onClick={() => updateQty(product.id, qty - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-primary transition active:scale-95"
                aria-label="Decrease quantity"
              >
                <Minus size={14} />
              </button>
              <span className="min-w-4 text-center text-[13px] font-bold text-foreground">{qty}</span>
              <button
                onClick={() => updateQty(product.id, qty + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full gradient-primary text-primary-foreground transition active:scale-95"
                aria-label="Increase quantity"
              >
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
