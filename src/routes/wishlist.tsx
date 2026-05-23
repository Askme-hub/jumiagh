import { createFileRoute } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { formatGHC, useShop } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/wishlist")({
  component: Wishlist,
  head: () => ({ meta: [{ title: "Wishlist – Jumia Ghana" }] }),
});

function Wishlist() {
  const wishlist = useShop((s) => s.wishlist);
  const toggle = useShop((s) => s.toggleWishlist);
  const add = useShop((s) => s.addToCart);

  return (
    <div>
      <SearchBar back />
      <h1 className="px-4 py-3 text-2xl font-bold">Wishlist</h1>

      {wishlist.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <ShoppingCart size={48} className="mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Your wishlist is empty.</p>
          <p className="text-sm text-muted-foreground mt-1">Tap the heart on a product to save it.</p>
        </div>
      ) : (
        wishlist.map((p) => {
          const outOfStock = p.stock === 0;
          return (
            <div key={p.id} className="bg-card border-t border-border p-3 flex gap-3">
              <div className="w-20 h-20 bg-muted rounded shrink-0">
                <img src={p.image} alt={p.name} loading="lazy" className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm line-clamp-2 leading-tight">{p.name}</p>
                <p className="font-bold mt-1">{formatGHC(p.price)}</p>
                {p.oldPrice && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="line-through text-muted-foreground">{formatGHC(p.oldPrice)}</span>
                    {p.discount && (
                      <span className="bg-primary-soft text-accent-foreground font-semibold px-1.5 py-0.5 rounded">
                        -{p.discount}%
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <button onClick={() => toggle(p)} className="text-primary text-sm font-semibold">Remove</button>
                  <button
                    disabled={outOfStock}
                    onClick={() => { add(p); toast.success("Added to cart"); }}
                    className={`px-4 py-2 rounded-md text-sm font-semibold ${
                      outOfStock ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {outOfStock ? "Out Of Stock" : "Add To Cart"}
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
      <div className="h-6" />
    </div>
  );
}
