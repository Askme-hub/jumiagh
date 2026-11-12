import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useUnreadChatCount } from "@/lib/messages";

/** Header chat icon linking to Messages, with a live unread badge. */
export function MessageBell({ variant = "mobile" }: { variant?: "mobile" | "desktop" }) {
  const { user } = useAuth();
  const { data: unread = 0 } = useUnreadChatCount(user?.id);
  if (!user) return null;

  const cls =
    variant === "mobile"
      ? "relative flex h-11 w-11 items-center justify-center rounded-full bg-card text-foreground shadow-soft transition active:scale-95"
      : "relative flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground hover:bg-muted/70 transition";

  return (
    <Link to="/messages" search={{ c: undefined }} aria-label={unread ? `Messages, ${unread} unread` : "Messages"} className={cls}>
      <MessageCircle size={20} />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
