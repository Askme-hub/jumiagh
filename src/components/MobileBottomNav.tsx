import { Link, useRouterState } from "@tanstack/react-router";
import { Home, LayoutGrid, ShoppingCart, Heart, UserCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useShop } from "@/lib/store";

const items = [
  { to: "/" as const, label: "Home", icon: Home, exact: true },
  { to: "/categories" as const, label: "Categories", icon: LayoutGrid },
  { to: "/cart" as const, label: "Cart", icon: ShoppingCart, badge: true },
  { to: "/wishlist" as const, label: "Wishlist", icon: Heart },
  { to: "/account" as const, label: "Account", icon: UserCircle2 },
];

export function MobileBottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const count = useShop((s) => s.cartCount());
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (path === "/login" || path === "/checkout") return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-card border-t border-border flex items-stretch">
      {items.map(({ to, label, icon: Icon, exact, badge }) => {
        const active = exact ? path === to : path === to || path.startsWith(to + "/");
        return (
          <Link
            key={to}
            to={to}
            className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition ${
              active ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <span className="relative">
              <Icon size={22} />
              {badge && mounted && count > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                  {count}
                </span>
              )}
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
