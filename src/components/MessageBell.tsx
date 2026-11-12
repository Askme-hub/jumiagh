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
      ? "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-foreground shadow-soft transition active:scale-95"
      : "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-muted transition";

  return (
    <Link to="/messages" search={{ c: undefined }} aria-label={unread ? `Messages, ${unread} unread` : "Messages"} className={cls}>
      <MessageCircle size={20} />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 ring-2 ring-background items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
