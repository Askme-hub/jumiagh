import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MessageSquareText, Star } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSellerReviews, useSellerReply } from "@/lib/reviews";
import { StarRating } from "@/components/StarRating";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/seller/reviews")({
  component: SellerReviews,
  head: () => ({
    meta: [
      { title: "Reviews — Kivora Seller" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function SellerReviews() {
  const { user, loading } = useAuth();
  const { data: reviews, isLoading } = useSellerReviews(user?.id);
  const reply = useSellerReply();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  if (loading || !user) return null;

  const list = reviews ?? [];
  const avg =
    list.length > 0
      ? Math.round((list.reduce((a, r) => a + r.rating, 0) / list.length) * 10) / 10
      : null;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Your shop rating</p>
        {avg !== null ? (
          <div className="mt-2 flex items-center gap-3">
            <span className="font-display text-3xl font-extrabold text-foreground">{avg}</span>
            <div>
              <StarRating value={avg} size={16} />
              <p className="text-xs text-muted-foreground">
                {list.length} review{list.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No reviews yet — they'll appear here as customers rate your products.</p>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading reviews…</p>
      ) : list.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No reviews yet"
          description="When customers review your products, you can read and reply to them here."
        />
      ) : (
        <div className="space-y-3">
          {list.map((r: any) => (
            <article key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-start gap-3">
                {r.products?.image_url && (
                  <img src={r.products.image_url} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{r.products?.name ?? "Product"}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <StarRating value={r.rating} size={12} />
                    <span>{r.reviewer_name ?? "Kivora customer"}</span>
                    <span>{new Date(r.created_at).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                </div>
              </div>
              {r.body && <p className="mt-2 text-sm leading-5 text-foreground/80">{r.body}</p>}

              {r.seller_reply && replyingTo !== r.id && (
                <div className="mt-2 rounded-xl bg-muted/60 p-3">
                  <p className="text-[11px] font-bold text-primary">Your reply</p>
                  <p className="mt-1 text-sm text-foreground/80">{r.seller_reply}</p>
                </div>
              )}

              {replyingTo === r.id ? (
                <form
                  className="mt-3 space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    reply.mutate(
                      { review_id: r.id, reply: draft },
                      { onSuccess: () => { setReplyingTo(null); setDraft(""); } },
                    );
                  }}
                >
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Write a public reply to this review"
                    rows={3}
                    maxLength={500}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={reply.isPending || !draft.trim()} className="rounded-xl">
                      {reply.isPending ? "Saving…" : "Save reply"}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setReplyingTo(null)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 rounded-xl"
                  onClick={() => { setReplyingTo(r.id); setDraft(r.seller_reply ?? ""); }}
                >
                  <MessageSquareText size={14} /> {r.seller_reply ? "Edit reply" : "Reply"}
                </Button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
