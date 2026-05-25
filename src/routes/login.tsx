import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { ArrowLeft, Star } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
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

      <div className="my-4 flex items-center gap-2">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">OR</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <button
        type="button"
        onClick={async () => {
          const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
          if (result.error) toast.error(result.error.message ?? "Google sign-in failed");
          else if (!result.redirected) router.navigate({ to: "/" });
        }}
        className="w-full border-2 border-border rounded-md py-3 font-semibold flex items-center justify-center gap-2 hover:bg-muted"
      >
        <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.2C41.4 35.5 44 30.2 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        Continue with Google
      </button>

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
