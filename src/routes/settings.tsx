import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, MapPin, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAddresses, useDeleteAddress } from "@/lib/addresses";
import { PageHeader } from "@/components/PageHeader";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Account Settings – Kivora Ghana" },
      { name: "description", content: "Update your Kivora profile, password, delivery addresses and app appearance." },
      { property: "og:title", content: "Account Settings – Kivora Ghana" },
      { property: "og:description", content: "Manage your Kivora account details, password and delivery addresses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const inputCls =
  "w-full border-2 border-border rounded-xl px-4 py-3 bg-background text-foreground outline-none focus:border-primary disabled:opacity-60";

function SettingsPage() {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  if (!user) {
    return (
      <div>
        <PageHeader title="Account Settings" />
        <div className="px-4 py-10 text-center">
          <p className="text-muted-foreground text-sm">Sign in to manage your account details.</p>
          <Link to="/login" className="inline-block mt-4 bg-primary text-primary-foreground font-bold px-6 py-3 rounded-xl">
            Log in / Sign up
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <PageHeader title="Account Settings" />
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <ProfileCard userId={user.id} email={user.email ?? ""} />
        <PasswordCard />
        <AddressesCard />
        <AppearanceCard />
        <DangerCard />
      </div>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-2xl p-4 shadow-sm">
      <h2 className="font-bold text-foreground">{title}</h2>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function ProfileCard({ userId, email }: { userId: string; email: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("display_name, email").eq("id", userId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile?.display_name) setName(profile.display_name);
  }, [profile]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) return toast.error("Name must be at least 2 characters");
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ display_name: trimmed }).eq("id", userId);
    if (!error) await supabase.auth.updateUser({ data: { display_name: trimmed } });
    setBusy(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["profile", userId] });
    toast.success("Profile updated");
  };

  return (
    <Card title="Profile" subtitle="Your name is shown on orders and messages.">
      <form onSubmit={save} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Display name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Email</label>
          <input value={email} disabled className={inputCls} />
          <p className="text-[11px] text-muted-foreground mt-1">Contact support to change your email address.</p>
        </div>
        <button disabled={busy} className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl disabled:opacity-60">
          {busy ? "Saving…" : "Save changes"}
        </button>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) return toast.error("Password must be at least 6 characters");
    if (pw !== pw2) return toast.error("Passwords do not match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error(error.message);
    setPw("");
    setPw2("");
    toast.success("Password updated");
  };

  return (
    <Card title="Password" subtitle="Choose a strong password you don't use elsewhere.">
      <form onSubmit={save} className="space-y-3">
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" className={inputCls} autoComplete="new-password" />
        <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Confirm new password" className={inputCls} autoComplete="new-password" />
        <button disabled={busy} className="w-full bg-foreground text-background font-bold py-3 rounded-xl disabled:opacity-60">
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>
    </Card>
  );
}

function AddressesCard() {
  const { data: addresses, isLoading } = useAddresses();
  const del = useDeleteAddress();

  return (
    <Card title="Delivery addresses" subtitle="Saved addresses appear at checkout.">
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : !addresses?.length ? (
        <p className="text-sm text-muted-foreground">No saved addresses yet.</p>
      ) : (
        <ul className="space-y-2">
          {addresses.map((a) => (
            <li key={a.id} className="flex items-start gap-3 border border-border rounded-xl p-3">
              <MapPin size={18} className="text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">
                  {a.full_name} {a.is_default && <span className="text-[10px] uppercase text-primary font-bold">• Default</span>}
                </p>
                <p className="text-xs text-muted-foreground truncate">{a.address}, {a.city}, {a.region}</p>
                <p className="text-xs text-muted-foreground">{a.phone}</p>
              </div>
              <button
                aria-label="Delete address"
                onClick={() => del.mutate(a.id, { onSuccess: () => toast.success("Address removed") })}
                className="text-destructive p-1"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Link to="/checkout" className="inline-flex items-center gap-2 text-sm font-bold text-primary">
        <Plus size={16} /> Add an address at checkout
      </Link>
    </Card>
  );
}

function AppearanceCard() {
  return (
    <Card title="Appearance" subtitle="Light, dark or match your device.">
      <ThemeToggle />
    </Card>
  );
}

function DangerCard() {
  const router = useRouter();
  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.navigate({ to: "/login" });
  };
  return (
    <Card title="Session">
      <button onClick={logout} className="w-full border-2 border-border text-primary font-bold py-3 rounded-xl">
        Log out
      </button>
    </Card>
  );
}
