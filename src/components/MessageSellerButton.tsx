import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { startConversation } from "@/lib/messages";

export function MessageSellerButton({
  sellerId,
  productId,
  className,
  label = "Message seller",
}: {
  sellerId: string;
  productId?: string | null;
  className?: string;
  label?: string;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const open = async () => {
    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        navigate({ to: "/login" });
        return;
      }
      if (user.id === sellerId) {
        toast.info("This is your own shop.");
        return;
      }
      const id = await startConversation({ customerId: user.id, sellerId, productId: productId ?? null });
      navigate({ to: "/messages", search: { c: id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't open chat");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={open}
      disabled={busy}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary disabled:opacity-50"
      }
    >
      <MessageCircle size={16} /> {busy ? "Opening…" : label}
    </button>
  );
}
