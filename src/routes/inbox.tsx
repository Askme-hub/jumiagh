import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SearchBar } from "@/components/SearchBar";

export const Route = createFileRoute("/inbox")({
  component: Inbox,
  head: () => ({ meta: [{ title: "Inbox – Jumia Ghana" }] }),
  beforeLoad: async () => {
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

  const markRead = async (id: string) => {
    await supabase.from("inbox_messages").update({ read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["inbox"] });
  };

  return (
    <div>
      <SearchBar />
      <h1 className="px-4 py-4 text-2xl font-bold border-t border-border">Inbox</h1>

      {isLoading ? (
        <p className="p-6 text-sm text-muted-foreground text-center">Loading…</p>
      ) : (data?.length ?? 0) === 0 ? (
        <p className="p-10 text-sm text-muted-foreground text-center">No messages yet.</p>
      ) : (
        data!.map((m) => {
          const isWarning = /cancel/i.test(m.title);
          return (
            <button
              key={m.id}
              onClick={() => markRead(m.id)}
              className="w-full text-left bg-card border-b border-border p-4"
            >
              <p className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}</p>
              <div className="flex items-start gap-2 mt-1">
                <h3 className="font-bold flex-1">
                  {m.title}{" "}
                  {isWarning && <AlertTriangle size={16} className="inline text-flash" />}
                </h3>
                <ChevronRight size={20} className="text-muted-foreground shrink-0" />
              </div>
              <p className="text-sm text-foreground/80 mt-1 line-clamp-3">{m.body}</p>
              {m.product_name && (
                <div className="mt-3 border border-border rounded p-2 flex gap-2 items-center">
                  {m.product_image && <img src={m.product_image} alt="" className="w-10 h-10 object-contain" />}
                  <p className="text-sm">{m.product_name}</p>
                </div>
              )}
              {!m.read && <span className="inline-block mt-2 text-xs text-primary font-semibold">● New</span>}
            </button>
          );
        })
      )}
      <div className="h-6" />
    </div>
  );
}
