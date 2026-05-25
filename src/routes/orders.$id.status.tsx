import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/orders/$id/status")({
  component: TestPage,
});

function TestPage() {
  const { id } = Route.useParams();

  return (
    <div className="p-10 text-white">
      <h1>Status Page Working</h1>
      <p>ID: {id}</p>
    </div>
  );
}
