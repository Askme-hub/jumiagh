import { useState } from "react";
import { BadgeCheck, MessageSquareText, Store } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  useProductReviews,
  useReviewableItems,
  useSubmitReview,
} from "@/lib/reviews";
import { StarRating, StarPicker } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@tanstack/react-router";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ProductReviews({ productId }: { productId: string }) {
  const { user } = useAuth();
  const { data: reviews, isLoading } = useProductReviews(productId);
  const { data: reviewable } = useReviewableItems(user?.id);
  const submit = useSubmitReview();
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [open, setOpen] = useState(false);

  const list = reviews ?? [];
  const avg =
    list.length > 0
      ? Math.round((list.reduce((a, r) => a + r.rating, 0) / list.length) * 10) / 10
      : null;

  const canReview = reviewable?.find((r) => r.product_id === productId);

  return (
    <section className="mt-2 bg-card p-4 lg:mt-0 lg:rounded-2xl lg:border lg:border-border">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold text-foreground">Customer Reviews</h2>
        {avg !== null && (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <StarRating value={avg} />
            {avg} · {list.length} review{list.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {canReview && !open && (
        <Button
          variant="outline"
          className="mt-3 w-full rounded-xl"
          onClick={() => setOpen(true)}
        >
          <MessageSquareText size={16} /> Write a review
        </Button>
      )}

      {canReview && open && (
        <form
          className="mt-3 space-y-3 rounded-2xl border border-border bg-muted/40 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate(
              {
                product_id: productId,
                order_item_id: canReview.order_item_id,
                rating,
                body,
              },
              { onSuccess: () => { setOpen(false); setBody(""); setRating(5); } },
            );
          }}
        >
          <StarPicker value={rating} onChange={setRating} />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share your experience with this product (optional)"
            rows={3}
            maxLength={1000}
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={submit.isPending} className="rounded-xl">
              {submit.isPending ? "Posting…" : "Post review"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {!user && (
        <p className="mt-3 text-xs text-muted-foreground">
          <Link to="/login" className="font-semibold text-primary">Sign in</Link> to review products you've purchased.
      </p>
      )}

      <div className="mt-4 space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading reviews…</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No reviews yet. Be the first to share your experience.
          </p>
        ) : (
          list.map((r) => (
            <article key={r.id} className="border-t border-border pt-3 first:border-0 first:pt-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StarRating value={r.rating} size={13} />
                  {r.verified_purchase && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                      <BadgeCheck size={11} /> Verified purchase
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground">{formatDate(r.created_at)}</span>
              </div>
              <p className="mt-1 text-xs font-semibold text-foreground">
                {r.reviewer_name ?? "Kivora customer"}
              </p>
              {r.body && <p className="mt-1 text-sm leading-5 text-foreground/80">{r.body}</p>}
              {r.seller_reply && (
                <div className="mt-2 rounded-xl bg-muted/60 p-3">
                  <p className="inline-flex items-center gap-1 text-[11px] font-bold text-primary">
                    <Store size={12} /> Seller response
                  </p>
                  <p className="mt-1 text-sm leading-5 text-foreground/80">{r.seller_reply}</p>
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
