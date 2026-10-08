import { createFileRoute } from "@tanstack/react-router";

import { SettingsScreen } from "@/features/settings/settings-screen";

export const Route = createFileRoute("/settings")({
  staticData: { title: "Settings" },
  component: SettingsScreen,
});
