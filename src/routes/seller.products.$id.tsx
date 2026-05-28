import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductForm } from "@/components/ProductForm";

export const Route = createFileRoute("/seller/products/$id")({ component: EditProduct });

function EditProduct() {
  const { id } = Route.useParams();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["seller-product", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  if (!data) return <p className="p-6 text-sm">Product not found.</p>;

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-3">Edit Product</h2>
      <ProductForm initial={data} onSaved={() => router.navigate({ to: "/seller/products" })} />
    </div>
  );
}
