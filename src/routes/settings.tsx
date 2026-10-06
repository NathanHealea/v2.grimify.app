import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings")({
  staticData: { title: "Settings" },
  component: SettingsScreen,
});

function SettingsScreen() {
  return <p>Account and app settings will appear here.</p>;
}
