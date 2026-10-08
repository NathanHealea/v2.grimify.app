import { createFileRoute } from "@tanstack/react-router";

import { AccountSection } from "@/features/auth/account-section";

export const Route = createFileRoute("/settings")({
  staticData: { title: "Settings" },
  component: SettingsScreen,
});

function SettingsScreen() {
  return <AccountSection />;
}
