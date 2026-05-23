import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  MessageCircle, MessageSquare, Info, Package, Mail, Star,
  Ticket, Heart, Store, History, Search as SearchIcon, ChevronRight, Wallet, Shield,
} from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({
  component: Account,
  head: () => ({ meta: [{ title: "Account – Jumia Ghana" }] }),
});

function Account() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { data: isAdmin } = useIsAdmin(user);

  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.navigate({ to: "/login" });
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  if (!user) {
    return (
      <div>
        <SearchBar />
        <div className="px-4 py-10 text-center">
          <h1 className="text-xl font-bold">You're not logged in</h1>
          <p className="text-muted-foreground text-sm mt-2">Sign in to view your account, orders and inbox.</p>
          <Link to="/login" className="inline-block mt-4 bg-primary text-primary-foreground font-bold px-6 py-3 rounded-md">
            Log in / Sign up
          </Link>
        </div>
      </div>
    );
  }

  const accountItems = [
    { icon: Package, label: "Orders", to: "/orders" as const },
    { icon: Mail, label: "Inbox", to: "/inbox" as const },
    { icon: Heart, label: "Wishlist", to: "/wishlist" as const },
    { icon: Star, label: "Ratings & Reviews" },
    { icon: Ticket, label: "Vouchers" },
    { icon: Store, label: "Follow Seller" },
    { icon: History, label: "Recently Viewed" },
    { icon: SearchIcon, label: "Recently Searched" },
  ];

  return (
    <div>
      <SearchBar />
      <div className="px-4 py-4 border-t border-border">
        <h1 className="text-2xl font-bold">Welcome {user.user_metadata?.display_name ?? user.email?.split("@")[0]}!</h1>
        <p className="text-primary mt-1">{user.email}</p>
        <div className="flex items-center gap-2 mt-3">
          <Wallet size={22} className="text-[#1d4ed8]" />
          <p className="text-[#1d4ed8] font-semibold">Jumia store credit balance: GH₵ 0</p>
        </div>
      </div>

      {isAdmin && (
        <Link to="/admin" className="flex items-center gap-3 px-4 py-3 bg-foreground text-background border-b border-border">
          <Shield size={20} />
          <span className="flex-1 font-bold">Open Admin Panel</span>
          <ChevronRight size={20} />
        </Link>
      )}

      <div className="bg-muted px-4 py-3 flex gap-2">
        <button className="flex-1 bg-primary text-primary-foreground font-bold py-3 rounded-md flex items-center justify-center gap-2">
          <MessageSquare size={18} /> Live Chat
        </button>
        <button className="flex-1 bg-background border-2 border-success text-success font-bold py-3 rounded-md flex items-center justify-center gap-2">
          <MessageCircle size={18} /> WhatsApp
        </button>
      </div>

      <Section title="Need Assistance?">
        <Row icon={Info} label="Help & Support" />
      </Section>

      <Section title="My Jumia Account">
        {accountItems.map((it) => (
          <Row key={it.label} icon={it.icon} label={it.label} to={it.to} />
        ))}
      </Section>

      <div className="mx-0 mt-2 bg-muted">
        <button onClick={logout} className="block w-full text-center py-4 text-primary font-bold">
          Logout
        </button>
      </div>
      <div className="h-6" />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-2">
      <p className="px-4 py-2 text-sm text-muted-foreground font-semibold border-b border-border">{title}</p>
      {children}
    </div>
  );
}

function Row({ icon: Icon, label, to }: { icon?: any; label: string; to?: "/wishlist" | "/orders" | "/inbox" }) {
  const content = (
    <div className="flex items-center gap-4 px-4 py-4 border-b border-border bg-card">
      {Icon && <Icon size={20} className="text-foreground/80" />}
      <span className="flex-1">{label}</span>
      <ChevronRight size={20} className="text-muted-foreground" />
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : <button className="w-full text-left">{content}</button>;
}
