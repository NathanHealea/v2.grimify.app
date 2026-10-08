import "./settings-screen.css";

import { AccountSection } from "@/features/auth/account-section";

/** UX_FLOWS Flow 9. */
export function SettingsScreen() {
  return (
    <div className="settings-screen">
      <AccountSection />
      <section className="settings-screen__section" aria-labelledby="appearance-heading">
        <h2 id="appearance-heading">Appearance</h2>
        {/* Dark mode is a NEXT item (ROADMAP); until then the app follows the system. */}
        <p>Theme: Follows your system</p>
      </section>
      <section className="settings-screen__section" aria-labelledby="about-heading">
        <h2 id="about-heading">About</h2>
        <p>Version {__APP_VERSION__}</p>
        {/* Plain text, not a link: an outside link would take an installed iOS app out of itself. */}
        <p className="settings-screen__note">
          Paint colors are approximate on-screen values. Most hex values come from PaintPad
          (paintpad.app); the rest come from manufacturer pages.
        </p>
        <p className="settings-screen__note">
          Paint and brand names are trademarks of their owners. Grimify isn't affiliated with any
          paint manufacturer.
        </p>
      </section>
    </div>
  );
}
