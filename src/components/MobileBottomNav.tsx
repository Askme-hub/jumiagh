import { Link, useRouterState } from "@tanstack/react-router";
import { Home, LayoutGrid, ShoppingBag, Heart, UserCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useShop } from "@/lib/store";

const left = [
  { to: "/" as const, label: "Home", icon: Home, exact: true },
  { to: "/categories" as const, label: "Shop", icon: LayoutGrid },
];

const right = [
  { to: "/wishlist" as const, label: "Saved", icon: Heart },
  { to: "/account" as const, label: "Profile", icon: UserCircle2 },
];

export function MobileBottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const count = useShop((s) => s.cartCount());
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (path === "/login" || path === "/checkout") return null;

  const Item = ({
    to,
    label,
    icon: Icon,
    exact,
  }: {
    to: string;
    label: string;
    icon: typeof Home;
    exact?: boolean;
  }) => {
    const active = exact ? path === to : path === to || path.startsWith(to + "/");
    return (
      <Link
        to={to}
        className={`flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[10px] font-semibold transition ${
          active ? "text-primary" : "text-muted-foreground"
        }`}
      >
        <Icon size={21} strokeWidth={active ? 2.4 : 1.9} />
        {label}
      </Link>
    );
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 pt-1 pointer-events-none">
      <div className="pointer-events-auto relative mx-auto flex max-w-md items-stretch rounded-[28px] border border-border bg-card/95 px-2 py-2 shadow-elevated backdrop-blur-xl">
        {left.map((i) => (
          <Item key={i.to} {...i} />
        ))}

        {/* Center elevated cart */}
        <div className="relative w-16 shrink-0">
          <Link
            to="/cart"
            aria-label="Cart"
            className="absolute left-1/2 -top-7 -translate-x-1/2 flex h-14 w-14 items-center justify-center rounded-full gradient-primary text-primary-foreground shadow-elevated ring-4 ring-background transition active:scale-95"
          >
            <ShoppingBag size={22} />
            {mounted && count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-flash px-1 text-[10px] font-bold text-flash-foreground ring-2 ring-card">
                {count}
              </span>
            )}
          </Link>
          <span className="absolute bottom-1 left-0 right-0 text-center text-[10px] font-semibold text-muted-foreground">
            Cart
          </span>
        </div>

        {right.map((i) => (
          <Item key={i.to} {...i} />
        ))}
      </div>
    </nav>
  );
}
