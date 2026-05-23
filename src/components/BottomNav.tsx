import { Link, useRouterState } from "@tanstack/react-router";
import { Home, LayoutGrid, ShoppingCart, Heart, UserCircle2 } from "lucide-react";
import { useShop } from "@/lib/store";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/categories", label: "Categories", icon: LayoutGrid },
  { to: "/cart", label: "Cart", icon: ShoppingCart },
  { to: "/wishlist", label: "Wishlist", icon: Heart },
  { to: "/account", label: "Account", icon: UserCircle2 },
] as const;

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const count = useShop((s) => s.cartCount());
  if (path === "/login" || path.startsWith("/admin")) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-background border-t border-border max-w-md mx-auto">
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, icon: Icon }) => {
          const active = path === to;
          return (
            <li key={to}>
              <Link
                to={to}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
                  active ? "text-primary" : "text-foreground"
                }`}
              >
                <span className="relative">
                  <Icon
                    size={22}
                    className={active ? "fill-primary/15" : ""}
                    strokeWidth={active ? 2.2 : 1.8}
                  />
                  {to === "/cart" && count > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-primary text-primary-foreground text-[10px] leading-none rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      {count}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
