import { Link, useRouterState } from "@tanstack/react-router";
import { Home, LayoutGrid, ShoppingCart, Heart, UserCircle2, Package, Store, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { useShop } from "@/lib/store";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { useIsSeller } from "@/hooks/use-seller";
import kivoraIcon from "@/assets/kivora-icon.png";

const baseItems = [
  { to: "/" as const, label: "Home", icon: Home },
  { to: "/categories" as const, label: "Categories", icon: LayoutGrid },
  { to: "/orders" as const, label: "Orders", icon: Package },
  { to: "/wishlist" as const, label: "Wishlist", icon: Heart },
  { to: "/account" as const, label: "Account", icon: UserCircle2 },
];

export function TopNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const count = useShop((s) => s.cartCount());
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin(user);
  const { data: isSeller } = useIsSeller(user);

  useEffect(() => setMounted(true), []);

  if (path === "/login") return null;

  return (
    <header className="hidden md:block sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-zinc-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={kivoraIcon} alt="Kivora" className="w-9 h-9 rounded-lg" />
          <span className="text-xl font-extrabold tracking-tight text-[#ff7a00]">Kivora</span>
        </Link>

        <nav className="flex items-center gap-1 flex-1">
          {baseItems.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? path === "/" : path.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                  active ? "bg-orange-50 text-[#ff7a00]" : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}

          {isSeller && (
            <Link
              to="/seller"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold ${
                path.startsWith("/seller") ? "bg-orange-50 text-[#ff7a00]" : "text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <Store size={18} /> Seller
            </Link>
          )}
          {isAdmin && (
            <Link
              to="/admin"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold ${
                path.startsWith("/admin") ? "bg-orange-50 text-[#ff7a00]" : "text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <Shield size={18} /> Admin
            </Link>
          )}
        </nav>

        <Link
          to="/cart"
          className="relative flex items-center gap-2 px-4 py-2 rounded-lg bg-[#ff7a00] text-white font-bold text-sm hover:bg-orange-600 transition"
        >
          <ShoppingCart size={18} />
          Cart
          {mounted && count > 0 && (
            <span className="ml-1 bg-white text-[#ff7a00] text-xs px-1.5 rounded-full font-extrabold">{count}</span>
          )}
        </Link>
      </div>
    </header>
  );
}
