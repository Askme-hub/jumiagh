import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff, MailCheck } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import kivoraLogo from "@/assets/kivora-logo.png";

export const Route = createFileRoute("/login")({
  component: Login,
  head: () => ({
    meta: [
      { title: "Sign in or create an account — Kivora Ghana" },
      { name: "description", content: "Log in or sign up to Kivora with email, Google or Apple." },
      { property: "og:title", content: "Sign in to Kivora Ghana" },
      { property: "og:description", content: "Shop and sell across Ghana on Kivora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().regex(/^(\+?233|0)?[235]\d{8}$/, "Enter a valid Ghana phone number (e.g. 024 123 4567)"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

const field = "w-full border-2 border-border bg-background text-foreground focus:border-primary rounded-md px-4 py-3.5 outline-none";

function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [agree, setAgree] = useState(false);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const parsed = signupSchema.safeParse({ name, email, phone: phone.replace(/\s/g, ""), password });
        if (!parsed.success) throw new Error(parsed.error.issues[0].message);
        if (!agree) throw new Error("Please accept the Terms & Conditions");
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: parsed.data.name, phone: parsed.data.phone, terms_accepted_at: new Date().toISOString() },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSentTo(parsed.data.email);
          return;
        }
        toast.success("Welcome to Kivora!");
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

  const social = async (provider: "google" | "apple") => {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) toast.error(result.error.message ?? "Sign-in failed");
    else if (!result.redirected) router.navigate({ to: "/" });
  };

  if (sentTo) {
    return (
      <div className="min-h-screen px-6 pt-16 pb-10 flex flex-col items-center max-w-md mx-auto text-center">
        <MailCheck size={56} className="text-primary" />
        <h1 className="mt-4 text-2xl font-bold text-foreground">Check your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a confirmation link to <span className="font-semibold text-foreground">{sentTo}</span>. Open it to activate your account, then log in. We'll verify your phone number by SMS right after.
        </p>
        <button onClick={() => { setSentTo(null); setMode("login"); }} className="mt-6 w-full bg-primary text-primary-foreground font-bold py-4 rounded-md">
          Go to log in
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 pt-4 pb-10 flex flex-col max-w-md mx-auto">
      <button onClick={() => router.history.back()} aria-label="Back" className="w-8 h-8 flex items-center text-foreground">
        <ArrowLeft size={22} />
      </button>

      <div className="mt-4 flex flex-col items-center">
        <img src={kivoraLogo} alt="Kivora" className="h-20 object-contain" />
        <h1 className="mt-2 text-2xl font-bold text-foreground">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-1 text-muted-foreground text-center text-sm">
          {mode === "login" ? "Log in to continue shopping." : "Shop and sell across Ghana."}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <button type="button" onClick={() => social("google")} className="w-full rounded-md border border-[#747775] bg-[#FFFFFF] py-3 px-3 font-medium text-[#1F1F1F] flex items-center justify-center gap-2.5">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.730-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.950-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
          Continue with Google
        </button>
        <button type="button" onClick={() => social("apple")} className="w-full rounded-md bg-[#000000] py-3 font-medium text-[#FFFFFF] border border-[#000000] dark:border-[#FFFFFF]">
          Continue with Apple
        </button>
      </div>

      <div className="my-4 flex items-center gap-2">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">OR USE EMAIL</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        {mode === "signup" && (
          <>
            <input required placeholder="Full name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
            <input required type="tel" inputMode="tel" autoComplete="tel" placeholder="Phone number (e.g. 024 123 4567)" value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
          </>
        )}
        <input type="email" required autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
        <div className="relative">
          <input
            type={show ? "text" : "password"}
            required
            minLength={mode === "signup" ? 8 : 6}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder={mode === "signup" ? "Password (min 8 characters)" : "Password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${field} pr-12`}
          />
          <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {mode === "signup" && (
          <label className="flex items-start gap-2 text-sm text-foreground">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]" />
            <span>
              I agree to Kivora's <Link to="/terms" className="font-semibold text-primary">Terms & Conditions</Link> and{" "}
              <Link to="/privacy" className="font-semibold text-primary">Privacy Policy</Link>
            </span>
          </label>
        )}

        <button
          type="submit"
          disabled={loading || (mode === "signup" && !agree)}
          className="mt-1 bg-primary text-primary-foreground font-bold py-4 rounded-md tracking-widest disabled:opacity-60"
        >
          {loading ? "..." : mode === "login" ? "LOG IN" : "CREATE ACCOUNT"}
        </button>
        {mode === "signup" && (
          <p className="text-center text-xs text-muted-foreground">We'll confirm your email, then verify your phone with a 6-digit SMS code.</p>
        )}
      </form>

      <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="mt-6 text-center text-primary font-semibold">
        {mode === "login" ? "New to Kivora? Create an account" : "Already have an account? Log in"}
      </button>

      <p className="mt-auto pt-8 text-center text-sm text-foreground/80">
        Need help? Call <span className="font-semibold">0257 573 471</span>
      </p>
      <Link to="/" className="mt-3 text-center text-xs text-muted-foreground">Continue browsing</Link>
    </div>
  );
}
