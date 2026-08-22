import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ProductForm } from "@/components/ProductForm";

export const Route = createFileRoute("/seller/products/new")({
  component: NewProduct,
  head: () => ({
    meta: [
      { title: "Add a product — Kivora Seller Hub" },
      { name: "description", content: "List a new product on Kivora in a few quick steps." },
    ],
  }),
});

function NewProduct() {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-2xl p-4 pb-28">
      <h2 className="text-xl font-extrabold">Add a product</h2>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">
        Three quick steps — a photo, a name and a price. Everything else is optional.
      </p>
      <ProductForm onSaved={() => router.navigate({ to: "/seller/products" })} />
    </div>
  );
}
