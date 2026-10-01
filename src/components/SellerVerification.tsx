import { useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, Clock, ShieldX, ShieldQuestion } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  userId: string;
  status: string;
  verificationStatus: string;
  onChanged?: () => void;
};

const COPY: Record<string, { label: string; message: string; icon: any; tone: string }> = {
  verified: {
    label: "Kivora Verified",
    message: "Your business has been verified by Kivora.",
    icon: BadgeCheck,
    tone: "text-primary",
  },
  pending: {
    label: "Verification Pending",
    message: "Your verification request is currently being reviewed.",
    icon: Clock,
    tone: "text-warning",
  },
  rejected: {
    label: "Verification Rejected",
    message: "Your verification request was not approved.",
    icon: ShieldX,
    tone: "text-destructive",
  },
  not_verified: {
    label: "Not Verified",
    message: "You haven't been verified by Kivora yet.",
    icon: ShieldQuestion,
    tone: "text-muted-foreground",
  },
};

export function SellerVerification({ userId, status, verificationStatus, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const info = COPY[verificationStatus] ?? COPY.not_verified;
  const Icon = info.icon;
  const canRequest =
    status === "approved" && (verificationStatus === "not_verified" || verificationStatus === "rejected");

  const request = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("seller_profiles")
      .update({ verification_status: "pending" } as any)
      .eq("user_id", userId);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Verification requested — an admin will review it");
    onChanged?.();
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2">
        <Icon size={18} className={info.tone} />
        <h3 className="font-bold text-foreground">{info.label}</h3>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{info.message}</p>

      {status !== "approved" && verificationStatus !== "verified" && (
        <p className="mt-2 text-xs text-muted-foreground">
          Your shop must be approved before you can request verification.
        </p>
      )}

      {canRequest && (
        <button
          type="button"
          disabled={busy}
          onClick={request}
          className="mt-3 w-full rounded-full gradient-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Sending…" : "Request verification"}
        </button>
      )}

      <div className="mt-4 rounded-xl bg-muted/60 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          What Kivora may review
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
          <li>Business or store information</li>
          <li>Contact information</li>
          <li>Seller identity or business information where appropriate</li>
          <li>Product information</li>
          <li>Seller activity</li>
          <li>Compliance with Kivora marketplace policies</li>
        </ul>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Kivora Verified means a seller has completed Kivora's verification process.
        </p>
      </div>
    </div>
  );
}
