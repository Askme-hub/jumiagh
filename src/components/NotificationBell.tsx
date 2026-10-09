import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck, Package, AlertTriangle, Info } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const ICONS: Record<string, typeof Package> = {
  new_order: Package,
  low_stock: AlertTriangle,
};

export function NotificationBell() {
  const { user } = useAuth();
  const { data: notifications } = useNotifications(user?.id);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const list = notifications ?? [];
  const unread = list.filter((n) => !n.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-display text-sm font-bold">Notifications</p>
          {unread > 0 && (
            <button
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
              onClick={() => markAll.mutate(user.id)}
            >
              <CheckCheck size={13} /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {list.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            list.map((n) => {
              const Icon = ICONS[n.type] ?? Info;
              const inner = (
                <div
                  className={cn(
                    "flex gap-3 px-4 py-3 transition hover:bg-muted/60",
                    !n.read && "bg-primary-soft/40",
                  )}
                  onClick={() => {
                    if (!n.read) markRead.mutate(n.id);
                    setOpen(false);
                  }}
                >
                  <span
                    className={cn(
                      "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                      n.type === "low_stock" ? "bg-warning/15 text-warning" : "bg-primary/10 text-primary",
                    )}
                  >
                    <Icon size={15} />
                  </span>
                  <div className="min-w-0">
                    <p className={cn("truncate text-sm", !n.read && "font-bold")}>{n.title}</p>
                    {n.body && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                    )}
                    <p className="mt-1 text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read && <span className="ml-auto mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </div>
              );
              return n.link ? (
                <Link key={n.id} to={n.link} className="block border-b border-border last:border-0">
                  {inner}
                </Link>
              ) : (
                <div key={n.id} className="border-b border-border last:border-0">
                  {inner}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
