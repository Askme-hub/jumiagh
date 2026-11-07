import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/** Header bell linking to the buyer inbox, with a live unread badge. */
export function InboxBell({ variant = "mobile" }: { variant?: "mobile" | "desktop" }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: unread = 0 } = useQuery({
    queryKey: ["inbox-unread", user?.id],
    enabled: !!user,
    refetchInterval: 60000,
    queryFn: async () => {
      const { count } = await supabase
        .from("inbox_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("read", false);
      return count ?? 0;
    },
  });

  // Refresh the badge whenever the inbox list itself changes (e.g. messages marked read).
  useEffect(() => {
    const unsub = qc.getQueryCache().subscribe((e) => {
      if (e.query.queryKey[0] === "inbox" && e.type === "updated") {
        qc.invalidateQueries({ queryKey: ["inbox-unread"] });
      }
    });
    return unsub;
  }, [qc]);

  if (!user) return null;

  const cls =
    variant === "mobile"
      ? "relative flex h-11 w-11 items-center justify-center rounded-full bg-card text-foreground shadow-soft transition active:scale-95"
      : "relative flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground hover:bg-muted/70 transition";

  return (
    <Link to="/inbox" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} className={cls}>
      <Bell size={20} />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
