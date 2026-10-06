import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/paints/")({
  staticData: { title: "Paints" },
  component: PaintsScreen,
});

function PaintsScreen() {
  return <p>The paint catalog will appear here.</p>;
}
