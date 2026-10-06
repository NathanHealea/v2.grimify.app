import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/my-paints")({
  staticData: { title: "My Paints" },
  component: MyPaintsScreen,
});

function MyPaintsScreen() {
  return <p>Your owned and wishlisted paints will appear here.</p>;
}
