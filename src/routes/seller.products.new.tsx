import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ProductForm } from "@/components/ProductForm";

export const Route = createFileRoute("/seller/products/new")({ component: NewProduct });

function NewProduct() {
  const router = useRouter();
  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-3">Add Product</h2>
      <p className="text-xs text-muted-foreground mb-4">
        New products are submitted to admin for approval before going live.
      </p>
      <ProductForm onSaved={() => router.navigate({ to: "/seller/products" })} />
    </div>
  );
}
