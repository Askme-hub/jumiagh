import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { formatGHC, useShop } from "@/lib/store";
import { toProduct, type DbProduct } from "@/lib/products";
import { Heart, ShoppingCart, Star, Truck, Shield } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/products/$id")({
  component: ProductDetails,
  head: () => ({ meta: [{ title: "Product Details – Jumia Ghana" }] }),
});

function ProductDetails() {
  const { id } = Route.useParams();
  const addToCart = useShop((s) => s.addToCart);
  const toggleWishlist = useShop((s) => s.toggleWishlist);
  const isWishlisted = useShop((s) => s.isWishlisted);
  const [activeImg, setActiveImg] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
      if (error) throw error;
      return data as DbProduct;
    },
  });

  if (isLoading) return <div><PageHeader title="Product" /><p className="p-6 text-sm text-muted-foreground">Loading…</p></div>;
  if (!data) return <div><PageHeader title="Product" /><p className="p-6 text-sm">Not found.</p></div>;

  const product = toProduct(data);
  const images = [product.image].filter(Boolean);
  const oldPrice = product.discount ? product.price + (product.price * product.discount) / 100 : null;
  const wished = isWishlisted(product.id);

  return (
    <div className="pb-24">
      <PageHeader title="Product Details" />

      <div className="bg-card">
        <div className="relative aspect-square bg-muted">
          <img src={images[activeImg]} alt={product.name} className="w-full h-full object-contain p-4" />
          {product.discount && (
            <div className="absolute top-3 left-3 bg-primary/15 text-primary text-xs font-bold px-2 py-1 rounded">
              -{product.discount}%
            </div>
          )}
          <button
            onClick={() => { toggleWishlist(product); toast.success(wished ? "Removed from wishlist" : "Added to wishlist"); }}
            className="absolute top-3 right-3 bg-card shadow rounded-full p-2 text-foreground"
          >
            <Heart size={18} fill={wished ? "currentColor" : "none"} className={wished ? "text-primary" : ""} />
          </button>
        </div>

        {images.length > 1 && (
          <div className="flex gap-2 px-3 py-2 overflow-x-auto">
            {images.map((img, i) => (
              <button key={i} onClick={() => setActiveImg(i)}
                className={`w-16 h-16 shrink-0 border-2 rounded ${i === activeImg ? "border-primary" : "border-border"}`}>
                <img src={img} alt="" className="w-full h-full object-contain" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card mt-2 p-4">
        <h1 className="text-lg font-semibold">{product.name}</h1>
        <div className="flex items-center gap-1 mt-2 text-yellow-400">
          {[1,2,3,4,5].map(i => <Star key={i} size={14} fill="currentColor" strokeWidth={0} />)}
          <span className="text-xs text-muted-foreground ml-1">(24 reviews)</span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-primary">{formatGHC(product.price)}</span>
          {oldPrice && <span className="text-sm text-muted-foreground line-through">{formatGHC(oldPrice)}</span>}
        </div>
        {data.stock > 0 ? (
          <p className="text-xs text-success font-semibold mt-1">In stock · {data.stock} available</p>
        ) : (
          <p className="text-xs text-destructive font-semibold mt-1">Out of stock</p>
        )}
      </div>

      {data.category && (
        <div className="bg-card mt-2 p-4 text-sm">
          <span className="text-muted-foreground">Category: </span>
          <span className="font-semibold">{data.category}</span>
        </div>
      )}

      <div className="bg-card mt-2 p-4">
        <h2 className="font-bold mb-2">Product Description</h2>
        <p className="text-sm text-foreground/80 whitespace-pre-line">
          {data.description ?? "No description provided for this product."}
        </p>
      </div>

      <div className="bg-card mt-2 p-4 space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <Truck size={18} className="text-primary" />
          <div>
            <p className="font-semibold">Delivery</p>
            <p className="text-xs text-muted-foreground">Door delivery or pickup station available across Ghana</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Shield size={18} className="text-primary" />
          <div>
            <p className="font-semibold">Return Policy</p>
            <p className="text-xs text-muted-foreground">Free returns within 7 days for eligible items</p>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-3 flex gap-2 z-40">
        <Link to="/cart" className="flex-1 border-2 border-primary text-primary rounded font-bold py-3 text-center">
          View Cart
        </Link>
        <button
          disabled={data.stock <= 0}
          onClick={() => { addToCart(product); toast.success("Added to cart"); }}
          className="flex-1 bg-primary text-primary-foreground rounded font-bold py-3 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <ShoppingCart size={18} /> Add to Cart
        </button>
      </div>
    </div>
  );
}
