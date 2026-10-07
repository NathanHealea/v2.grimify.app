import "./install-banner.css";

import { Share } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

import {
  HINT_DELAY_MS,
  isDismissed,
  isIosDevice,
  isStandalone,
  readDismissedAt,
  recordVisit,
  rememberDismissal,
  shouldShowIosHint,
} from "./install-hint";

/** Chrome's install event; not in the DOM typings. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallBanner() {
  // recordVisit is idempotent per session, so StrictMode's double initializer doesn't count twice.
  const [visits] = useState(() => recordVisit());
  // Read once at mount: a 30-day dismissal doesn't need re-checking while the page is open.
  const [{ now, dismissedAt }] = useState(() => ({
    now: Date.now(),
    dismissedAt: readDismissedAt(),
  }));
  const [delayPassed, setDelayPassed] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDelayPassed(true), HINT_DELAY_MS);
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  const timingMet = visits >= 2 || delayPassed;
  const showIos = shouldShowIosHint({
    isIos: isIosDevice(navigator.userAgent, navigator.maxTouchPoints),
    standalone: isStandalone(),
    visits,
    elapsedMs: delayPassed ? HINT_DELAY_MS : 0,
    dismissedAt,
    now,
  });
  const showInstall = installEvent !== null && timingMet && !isDismissed(dismissedAt, now);

  if (closed || (!showInstall && !showIos)) return null;

  const notNow = () => {
    rememberDismissal(Date.now());
    setClosed(true);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    setClosed(true);
  };

  return (
    <section className="install-banner" aria-label="Install Grimify">
      <div className="install-banner__text">
        <p className="install-banner__title">Install Grimify</p>
        {showInstall ? (
          <p>Add it to your home screen for quick, offline access.</p>
        ) : (
          <p>
            Tap Share <Share className="install-banner__icon" aria-hidden="true" />, then Add to
            Home Screen.
          </p>
        )}
      </div>
      <div className="install-banner__actions">
        <Button variant="ghost" onClick={notNow}>
          Not now
        </Button>
        {showInstall && <Button onClick={() => void install()}>Install app</Button>}
      </div>
    </section>
  );
}
