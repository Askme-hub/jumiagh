import { Product, formatGHC, useShop } from "@/lib/store";
import {
  Heart,
  Star,
  Minus,
  Plus,
  ShoppingBag,
} from "lucide-react";

import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

export function ProductCard({
  product,
}: {
  product: Product;
}) {
  const addToCart = useShop((s) => s.addToCart);
  const updateQty = useShop((s) => s.updateQty);

  const cartItem = useShop((s) =>
    s.cart.find((c) => c.product.id === product.id)
  );

  const qty = cartItem?.qty ?? 0;

  const oldPrice = product.discount
    ? product.price +
      (product.price * product.discount) / 100
    : null;

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-zinc-200 hover:border-[#ff7a00]/40 hover:shadow-xl transition-all duration-300 w-full">
      
      {/* IMAGE */}
      <Link
        to="/products/$id"
        params={{ id: product.id }}
        className="relative bg-gradient-to-b from-zinc-100 to-white aspect-square block overflow-hidden"
      >
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
        />

        {/* DISCOUNT BADGE */}
        {product.discount && (
          <div className="absolute top-2 left-2 bg-[#ff7a00] text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md">
            -{product.discount}% OFF
          </div>
        )}

        {/* FAVORITE */}
        <button className="absolute top-2 right-2 bg-white/90 backdrop-blur shadow-md rounded-full p-1.5 hover:bg-[#ff7a00] hover:text-white transition">
          <Heart size={14} />
        </button>

        {/* KIVORA DEAL */}
        <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur text-white text-[9px] px-2 py-1 rounded-full font-semibold tracking-wide">
          KIVORA DEAL
        </div>
      </Link>

      {/* CONTENT */}
      <div className="p-3">
        
        {/* PRODUCT NAME */}
        <h3 className="text-[13px] leading-5 line-clamp-2 min-h-[42px] text-zinc-800 font-medium">
          {product.name}
        </h3>

        {/* PRICE */}
        <div className="mt-2">
          <p className="font-extrabold text-[17px] text-black">
            {formatGHC(product.price)}
          </p>

          {oldPrice && (
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[11px] text-zinc-400 line-through">
                {formatGHC(oldPrice)}
              </p>

              <span className="text-[10px] text-green-600 font-semibold">
                Save {product.discount}%
              </span>
            </div>
          )}
        </div>

        {/* RATING */}
        <div className="flex items-center gap-1 mt-2">
          <div className="flex text-yellow-400">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                size={11}
                fill="currentColor"
                strokeWidth={0}
              />
            ))}
          </div>

          <span className="text-[11px] text-zinc-500 font-medium">
            4.9
          </span>

          <span className="text-[10px] text-zinc-400">
            (24 reviews)
          </span>
        </div>

        {/* STOCK */}
        {product.stock && (
          <div className="mt-2">
            <p className="text-[11px] text-[#ff7a00] font-semibold">
              Only {product.stock} left in stock
            </p>

            <div className="w-full bg-zinc-200 rounded-full h-1.5 mt-1 overflow-hidden">
              <div
                className="bg-[#ff7a00] h-full rounded-full"
                style={{
                  width: `${Math.min(
                    product.stock * 10,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* BUTTONS */}
        {qty === 0 ? (
          <button
            onClick={() => {
              addToCart(product);

              toast.success(
                `${product.name} added to cart`
              );
            }}
            className="w-full mt-3 bg-black text-white rounded-xl py-2.5 text-[13px] font-semibold hover:bg-[#ff7a00] transition-all duration-300 flex items-center justify-center gap-2 shadow-md"
          >
            <ShoppingBag size={15} />
            Add to Cart
          </button>
        ) : (
          <div className="w-full mt-3 flex items-center justify-between bg-zinc-100 rounded-xl overflow-hidden border border-[#ff7a00]/20">
            <button
              onClick={() =>
                updateQty(product.id, qty - 1)
              }
              className="w-10 h-10 flex items-center justify-center text-[#ff7a00] hover:bg-orange-50 transition"
              aria-label="Decrease"
            >
              <Minus size={15} />
            </button>

            <span className="text-[13px] font-bold text-black">
              {qty} in cart
            </span>

            <button
              onClick={() =>
                updateQty(product.id, qty + 1)
              }
              className="w-10 h-10 flex items-center justify-center text-[#ff7a00] hover:bg-orange-50 transition"
              aria-label="Increase"
            >
              <Plus size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
