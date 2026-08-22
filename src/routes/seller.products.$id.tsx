import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductForm } from "@/components/ProductForm";

export const Route = createFileRoute("/seller/products/$id")({
  component: EditProduct,
  head: () => ({
    meta: [
      { title: "Edit product — Kivora Seller Hub" },
      { name: "description", content: "Update your product details, price and stock on Kivora." },
    ],
  }),
});

function EditProduct() {
  const { id } = Route.useParams();
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ["seller-product", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  if (error)
    return <p className="p-6 text-sm text-destructive">Couldn’t load this product. Please try again.</p>;
  if (!data)
    return (
      <div className="p-8 text-center">
        <p className="text-sm">Product not found, or you don’t have access to it.</p>
        <Link to="/seller/products" className="mt-3 inline-block font-semibold text-primary">
          Back to my products
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl p-4 pb-28">
      <h2 className="text-xl font-extrabold mb-4">Edit product</h2>
      <ProductForm initial={data} onSaved={() => router.navigate({ to: "/seller/products" })} />
    </div>
  );
}
