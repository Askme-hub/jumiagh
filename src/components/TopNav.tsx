import { Link, useRouterState } from "@tanstack/react-router";
import { ShoppingCart, UserCircle2, Store, Shield, Search, HelpCircle, Package, Heart, LayoutGrid } from "lucide-react";
import { useEffect, useState } from "react";
import { useShop } from "@/lib/store";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { useIsSeller } from "@/hooks/use-seller";
import { useSearchUI } from "@/lib/search-ui";
import { useCategories } from "@/lib/categories";
import kivoraIcon from "@/assets/kivora-icon.png";
import { UserAvatar } from "@/components/UserAvatar";
import { InboxBell } from "@/components/InboxBell";

export function TopNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const count = useShop((s) => s.cartCount());
  const openSearch = useSearchUI((s) => s.setOpen);
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin(user);
  const { data: isSeller } = useIsSeller(user);
  const { data: categories = [] } = useCategories();

  useEffect(() => setMounted(true), []);

  if (path === "/login") return null;

  const pill = "flex items-center gap-2 rounded-md px-3 py-2 text-[15px] font-medium text-foreground transition hover:bg-muted";

  return (
    <header className="sticky top-0 z-40 hidden border-b border-border bg-background shadow-sm md:block">
      <div className="mx-auto flex max-w-7xl items-center gap-5 px-6 py-3">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <img src={kivoraIcon} alt="Kivora" className="h-9 w-9 rounded-lg" />
          <span className="text-2xl font-extrabold uppercase tracking-tight text-foreground">
            Kivora<span className="text-primary">★</span>
          </span>
        </Link>

        <button
          onClick={() => openSearch(true)}
          aria-label="Search"
          className="flex flex-1 items-center gap-3 rounded-full bg-muted py-1.5 pl-5 pr-1.5 text-left text-muted-foreground transition hover:bg-muted/70"
        >
          <Search size={20} className="shrink-0" />
          <span className="flex-1 truncate text-[15px]">Search products, brands and categories</span>
          <span className="rounded-full bg-primary px-6 py-2 text-sm font-bold text-primary-foreground">Search</span>
        </button>

        <nav className="flex shrink-0 items-center gap-1">
          {mounted && !user ? (
            <Link to="/login" className="mr-1 flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90">
              <UserCircle2 size={18} /> Login / Sign up
            </Link>
          ) : (
            <Link to="/account" className={pill}>
              {user ? <UserAvatar user={user} size={22} /> : <UserCircle2 size={22} />}
              Account
            </Link>
          )}
          <Link to="/orders" className={pill} aria-label="Orders"><Package size={20} /></Link>
          <Link to="/wishlist" className={pill} aria-label="Wishlist"><Heart size={20} /></Link>
          <Link to="/help" className={pill}><HelpCircle size={22} /> Help</Link>
          {isSeller && <Link to="/seller" className={pill} aria-label="Seller Hub"><Store size={20} /></Link>}
          {isAdmin && <Link to="/admin" className={pill} aria-label="Admin"><Shield size={20} /></Link>}
          <InboxBell variant="desktop" />
          <Link to="/cart" className={`${pill} relative`}>
            <ShoppingCart size={22} />
            Cart
            {mounted && count > 0 && (
              <span className="absolute left-5 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </Link>
        </nav>
      </div>

      <div className="mx-auto max-w-7xl overflow-x-auto px-6 scrollbar-none">
        <div className="flex items-center gap-6 pb-2.5 text-[15px] text-foreground">
          <Link to="/categories" className="flex shrink-0 items-center gap-2 hover:text-primary">
            <LayoutGrid size={18} /> All Categories
          </Link>
          {categories.map((c) => (
            <Link key={c.id} to="/categories" search={{ c: c.name }} className="flex shrink-0 items-center gap-2 hover:text-primary">
              {c.image_url && <img src={c.image_url} alt="" className="h-5 w-5 rounded object-cover" />}
              {c.name}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
