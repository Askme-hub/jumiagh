import { Link, useRouterState } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useUnreadChatCount } from "@/lib/messages";

type MessageRoute = "/messages" | "/seller/messages";

/** Header message icon with live unread chat badge. Links to buyer or seller messages. */
export function MessageBell({
  variant = "mobile",
  forceTo,
}: {
  variant?: "mobile" | "desktop" | "workspace";
  /** Override destination (e.g. always /seller/messages inside seller workspace). */
  forceTo?: MessageRoute;
}) {
  const { user } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { data: unread = 0 } = useUnreadChatCount(user?.id);

  if (!user) return null;

  const href: MessageRoute =
    forceTo ?? (path.startsWith("/seller") ? "/seller/messages" : "/messages");

  const cls =
    variant === "mobile"
      ? "relative flex h-11 w-11 items-center justify-center rounded-full bg-card text-foreground shadow-soft transition active:scale-95"
      : variant === "workspace"
        ? "relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground transition"
        : "relative flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground hover:bg-muted/70 transition";

  return (
    <Link
      to={href}
      aria-label={unread ? `Messages, ${unread} unread` : "Messages"}
      className={cls}
    >
      <MessageCircle size={variant === "workspace" ? 16 : 20} />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
