import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { ArrowLeft, Star } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: Login,
  head: () => ({ meta: [{ title: "Welcome to Jumia" }] }),
});

function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Welcome to Jumia!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
      }
      router.navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-6 pt-4 pb-10 flex flex-col">
      <button onClick={() => router.history.back()} aria-label="Back" className="w-8 h-8 flex items-center">
        <ArrowLeft size={22} />
      </button>

      <div className="mt-4 flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
          <Star size={32} className="text-primary-foreground fill-primary-foreground" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">Welcome to Jumia</h1>
        <p className="mt-1 text-muted-foreground text-center text-sm">
          {mode === "login" ? "Log in to continue shopping." : "Create an account in seconds."}
        </p>
      </div>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        {mode === "signup" && (
          <input
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border-2 border-border focus:border-primary rounded-md px-4 py-3.5 outline-none"
          />
        )}
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border-2 border-border focus:border-primary rounded-md px-4 py-3.5 outline-none"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Password (min 6 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border-2 border-border focus:border-primary rounded-md px-4 py-3.5 outline-none"
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-primary text-primary-foreground font-bold py-4 rounded-md tracking-widest disabled:opacity-60"
        >
          {loading ? "..." : mode === "login" ? "LOG IN" : "SIGN UP"}
        </button>
      </form>

      <button
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
        className="mt-6 text-center text-primary font-semibold"
      >
        {mode === "login" ? "New to Jumia? Create an account" : "Already have an account? Log in"}
      </button>

      <p className="mt-auto pt-8 text-center text-sm text-foreground/80">
        Need help? Call <span className="font-semibold">0302 740 642</span>
      </p>
      <Link to="/" className="mt-3 text-center text-xs text-muted-foreground">Continue browsing</Link>
    </div>
  );
}
