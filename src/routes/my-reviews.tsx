import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { StarRating } from "@/components/StarRating";
import { useReviewableItems } from "@/lib/reviews";

export const Route = createFileRoute("/my-reviews")({
  component: MyReviews,
  head: () => ({
    meta: [
      { title: "My Ratings & Reviews – Kivora Ghana" },
      { name: "description", content: "Rate products you bought and see the reviews you've written on Kivora Ghana." },
      { property: "og:title", content: "My Ratings & Reviews – Kivora Ghana" },
      { property: "og:description", content: "Rate products you bought and see the reviews you've written on Kivora Ghana." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function MyReviews() {
  const { user } = useAuth();
  const { data: toReview = [] } = useReviewableItems(user?.id);
  const { data: mine = [] } = useQuery({
    queryKey: ["reviews", "mine", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews").select("*, products(name, image_url)")
        .eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!user) {
    return (
      <div>
        <PageHeader title="Ratings & Reviews" />
        <div className="px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">Sign in to rate products you've bought.</p>
          <Link to="/login" className="mt-4 inline-block rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground">Log in / Sign up</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <PageHeader title="Ratings & Reviews" />
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <section>
          <h2 className="mb-2 font-bold">Waiting for your review ({toReview.length})</h2>
          {toReview.length === 0 && <p className="text-sm text-muted-foreground">Nothing to review right now.</p>}
          <div className="space-y-2">
            {toReview.map((i) => (
              <Link key={i.product_id} to="/products/$id" params={{ id: i.product_id }} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-muted">
                  {i.image_url && <img src={i.image_url} alt="" className="h-full w-full object-contain" />}
                </div>
                <p className="flex-1 text-sm line-clamp-2">{i.name}</p>
                <span className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">Rate</span>
              </Link>
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-2 font-bold">Your reviews ({mine.length})</h2>
          {mine.length === 0 && <p className="text-sm text-muted-foreground">You haven't written any reviews yet.</p>}
          <div className="space-y-2">
            {mine.map((r: any) => (
              <Link key={r.id} to="/products/$id" params={{ id: r.product_id }} className="block rounded-xl border border-border bg-card p-3">
                <p className="text-sm font-semibold line-clamp-1">{r.products?.name ?? "Product"}</p>
                <StarRating value={r.rating} />
                {r.body && <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>}
                {r.seller_reply && <p className="mt-2 rounded-lg bg-muted p-2 text-xs"><b>Seller reply:</b> {r.seller_reply}</p>}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
