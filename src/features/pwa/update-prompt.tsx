import "./update-prompt.css";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  needRefresh: boolean;
  onReload: () => void;
};

/** "Update available" bar; dismissing hides it for this session only. */
export function UpdatePrompt({ needRefresh, onReload }: Props) {
  const [dismissed, setDismissed] = useState(false);
  if (!needRefresh || dismissed) return null;

  return (
    <section className="update-prompt" aria-label="App update">
      <p className="update-prompt__text">Update available</p>
      <Button variant="ghost" onClick={() => setDismissed(true)}>
        Later
      </Button>
      <Button onClick={onReload}>Reload</Button>
    </section>
  );
}
