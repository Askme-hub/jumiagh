import { Link, useRouterState } from "@tanstack/react-router";
import { Home, LayoutGrid, ShoppingCart, Heart, UserCircle2, Package, Store, Shield, Search, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { useShop } from "@/lib/store";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { useIsSeller } from "@/hooks/use-seller";
import { useSearchUI } from "@/lib/search-ui";
import kivoraIcon from "@/assets/kivora-icon.png";

const baseItems = [
  { to: "/" as const, label: "Home", icon: Home },
  { to: "/categories" as const, label: "Categories", icon: LayoutGrid },
  { to: "/orders" as const, label: "Orders", icon: Package },
  { to: "/wishlist" as const, label: "Wishlist", icon: Heart },
  { to: "/inbox" as const, label: "Inbox", icon: UserCircle2 },
  { to: "/account" as const, label: "Account", icon: UserCircle2 },
];

export function TopNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const count = useShop((s) => s.cartCount());
  const openSearch = useSearchUI((s) => s.setOpen);
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin(user);
  const { data: isSeller } = useIsSeller(user);

  useEffect(() => setMounted(true), []);

  if (path === "/login") return null;

  const linkCls = (active: boolean) =>
    `relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition ${
      active ? "bg-primary/10 text-primary" : "text-foreground/70 hover:bg-muted"
    }`;

  return (
    <header className="hidden md:block sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={kivoraIcon} alt="Kivora" className="w-9 h-9 rounded-lg" />
          <span className="text-xl font-extrabold tracking-tight text-primary">Kivora</span>
        </Link>

        <nav className="flex items-center gap-1 flex-1">
          {baseItems.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? path === "/" : path.startsWith(to);
            return (
              <Link key={to} to={to} className={linkCls(active)}>
                <Icon size={18} />
                {label}
              </Link>
            );
          })}

          {isSeller && (
            <Link to="/seller" className={linkCls(path.startsWith("/seller"))}>
              <Store size={18} /> Seller
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin" className={linkCls(path.startsWith("/admin"))}>
              <Shield size={18} /> Admin
            </Link>
          )}
        </nav>

        <button
          onClick={() => openSearch(true)}
          aria-label="Search"
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted text-foreground hover:bg-muted/70 transition"
        >
          <Search size={18} />
        </button>

        <Link
          to="/cart"
          className="relative flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition"
        >
          <ShoppingCart size={18} />
          Cart
          {mounted && count > 0 && (
            <span className="ml-1 bg-background text-primary text-xs px-1.5 rounded-full font-extrabold">
              {count}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
