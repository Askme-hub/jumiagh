import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ChevronRight, Mail, MailOpen, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/inbox")({
  component: Inbox,
  head: () => ({ meta: [{ title: "Inbox – Kivora Ghana" }] }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
});

function Inbox() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["inbox"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inbox_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const unread = (data ?? []).filter((m) => !m.read).length;

  const markRead = async (id: string) => {
    await supabase.from("inbox_messages").update({ read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["inbox"] });
  };

  const markAllRead = async () => {
    await supabase.from("inbox_messages").update({ read: true }).eq("read", false);
    qc.invalidateQueries({ queryKey: ["inbox"] });
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="flex items-center justify-between px-4 py-4 border-t border-border">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inbox</h1>
          <p className="text-xs text-muted-foreground">
            {unread > 0 ? `${unread} unread message${unread === 1 ? "" : "s"}` : "All caught up"}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-foreground/10 animate-pulse" />
          ))}
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="py-20 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
            <Mail size={26} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">No messages yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Order updates and notifications will appear here.
          </p>
        </div>
      ) : (
        data!.map((m) => {
          const isWarning = /cancel/i.test(m.title);
          return (
            <button
              key={m.id}
              onClick={() => !m.read && markRead(m.id)}
              className={`w-full text-left border-b border-border p-4 transition ${
                m.read ? "bg-background" : "bg-primary/5"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    m.read ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"
                  }`}
                >
                  {m.read ? <MailOpen size={18} /> : <Mail size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      {new Date(m.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                      })}
                    </p>
                    {!m.read && (
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wide">
                        ● New
                      </span>
                    )}
                  </div>
                  <div className="flex items-start gap-2 mt-0.5">
                    <h3 className={`flex-1 ${m.read ? "font-semibold" : "font-bold"} text-foreground`}>
                      {m.title}{" "}
                      {isWarning && <AlertTriangle size={16} className="inline text-destructive" />}
                    </h3>
                    <ChevronRight size={20} className="text-muted-foreground shrink-0" />
                  </div>
                  <p className="text-sm text-foreground/80 mt-1 line-clamp-3">{m.body}</p>
                  {m.product_name && (
                    <div className="mt-3 border border-border rounded-lg p-2 flex gap-2 items-center bg-card">
                      {m.product_image && (
                        <img src={m.product_image} alt="" className="w-10 h-10 object-contain" />
                      )}
                      <p className="text-sm text-foreground">{m.product_name}</p>
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })
      )}
      <div className="h-6" />
    </div>
  );
}
