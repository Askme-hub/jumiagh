import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Star, Facebook } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  component: Login,
  head: () => ({ meta: [{ title: "Welcome to Jumia" }] }),
});

function Login() {
  const router = useRouter();
  const [value, setValue] = useState("");
  return (
    <div className="min-h-screen px-6 pt-4 pb-10 flex flex-col">
      <button onClick={() => router.history.back()} aria-label="Back" className="w-8 h-8 flex items-center">
        <ArrowLeft size={22} />
      </button>

      <div className="mt-6 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
          <Star size={40} className="text-primary-foreground fill-primary-foreground" />
        </div>
        <h1 className="mt-5 text-2xl font-bold">Welcome to Jumia</h1>
        <p className="mt-2 text-muted-foreground text-center">
          Use your email or phone to log in or sign up.
        </p>
      </div>

      <div className="mt-8 relative">
        <label className="absolute -top-2 left-3 bg-background px-1 text-xs text-primary">
          Email or Mobile Number*
        </label>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full border-2 border-primary rounded-md px-4 py-4 outline-none caret-primary"
        />
      </div>

      <button
        onClick={() => router.navigate({ to: "/" })}
        className="mt-10 bg-primary text-primary-foreground font-bold py-4 rounded-md tracking-widest"
      >
        Continue
      </button>

      <div className="mt-10 flex items-center gap-3 text-muted-foreground text-sm">
        <div className="flex-1 h-px bg-border" />
        Or log in with
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="mt-5 flex justify-center gap-6">
        <button className="w-12 h-12 rounded-full bg-[#1877F2] flex items-center justify-center" aria-label="Facebook">
          <Facebook size={26} className="text-white fill-white" />
        </button>
        <button className="w-12 h-12 rounded-full border border-border flex items-center justify-center bg-background" aria-label="Google">
          <svg viewBox="0 0 24 24" className="w-7 h-7">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
          </svg>
        </button>
      </div>

      <p className="mt-12 text-center text-sm">
        By continuing you agree to Jumia's <br/>
        <a className="text-primary underline font-medium">Terms and Conditions</a>
      </p>

      <p className="mt-6 text-center text-sm text-foreground/80">
        Need help? Visit our Help Center or contact us on<br/>
        0302740642
      </p>
    </div>
  );
}
