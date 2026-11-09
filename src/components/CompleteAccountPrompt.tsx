import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { sendPhoneOTP, verifyPhoneOTP } from "@/lib/phone-otp.functions";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const SKIP_KEY = "kivora-complete-skip";

/** After sign-in, asks the user to confirm their Ghana phone number (and accept terms if they came via Google/Apple). */
export function CompleteAccountPrompt() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [needTerms, setNeedTerms] = useState(false);
  const [agree, setAgree] = useState(false);
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return setOpen(false);
    if (sessionStorage.getItem(SKIP_KEY) === user.id) return;
    supabase.from("profiles").select("phone, phone_verified_at, terms_accepted_at").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (!data || data.phone_verified_at) return;
        const meta = user.user_metadata ?? {};
        setPhone(data.phone || meta.phone || "");
        const termsOk = !!data.terms_accepted_at || !!meta.terms_accepted_at;
        setNeedTerms(!termsOk);
        if (!data.terms_accepted_at && meta.terms_accepted_at) {
          void supabase.from("profiles").update({ terms_accepted_at: meta.terms_accepted_at, phone: meta.phone ?? null }).eq("id", user.id);
        }
        setOpen(true);
      });
  }, [user]);

  useEffect(() => {
    if (count <= 0) return;
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count]);

  const later = () => {
    if (user) sessionStorage.setItem(SKIP_KEY, user.id);
    setOpen(false);
  };

  const send = async () => {
    if (needTerms && !agree) return toast.error("Please accept the Terms & Conditions");
    setBusy(true);
    setStep("code");
    setCount(60);
    try {
      if (needTerms && user) await supabase.from("profiles").update({ terms_accepted_at: new Date().toISOString() }).eq("id", user.id);
      await sendPhoneOTP({ data: { phone } });
      toast.success("Code sent by SMS");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't send code");
      setStep("phone");
      setCount(0);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    try {
      await verifyPhoneOTP({ data: { phone, code } });
      toast.success("Phone number verified");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  const input = "w-full rounded-md border-2 border-border bg-background px-4 py-3 text-foreground outline-none focus:border-primary";

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? setOpen(true) : later())}>
      <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-2xl">
        <SheetHeader>
          <ShieldCheck className="mx-auto text-primary" size={36} />
          <SheetTitle className="text-center">Verify your phone number</SheetTitle>
          <p className="text-center text-sm text-muted-foreground">
            Sellers and riders use it to reach you about orders.
          </p>
        </SheetHeader>
        <div className="mt-4 flex flex-col gap-3 pb-4">
          {step === "phone" ? (
            <>
              <input className={input} type="tel" inputMode="tel" placeholder="e.g. 024 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
              {needTerms && (
                <label className="flex items-start gap-2 text-sm text-foreground">
                  <input type="checkbox" className="mt-1 accent-[hsl(var(--primary))]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                  <span>I agree to Kivora's <Link to="/terms" className="font-semibold text-primary">Terms & Conditions</Link> and <Link to="/privacy" className="font-semibold text-primary">Privacy Policy</Link></span>
                </label>
              )}
              <button onClick={send} disabled={busy || phone.trim().length < 9 || (needTerms && !agree)} className="rounded-md bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50">
                Send code
              </button>
            </>
          ) : (
            <>
              <p className="text-center text-sm text-muted-foreground">Enter the 6-digit code sent to {phone}</p>
              <input className={`${input} text-center text-2xl tracking-[0.5em]`} inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoFocus />
              <button onClick={verify} disabled={busy || code.length !== 6} className="rounded-md bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50">
                Verify
              </button>
              <button onClick={send} disabled={count > 0 || busy} className="text-sm font-semibold text-primary disabled:text-muted-foreground">
                {count > 0 ? `Resend in ${count}s` : "Resend code"}
              </button>
              <button onClick={() => { setStep("phone"); setCode(""); }} className="text-xs text-muted-foreground">Change number</button>
            </>
          )}
          <button onClick={later} className="text-xs text-muted-foreground">Do it later</button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
