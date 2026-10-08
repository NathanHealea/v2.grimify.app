import "./toast.css";

import { X } from "lucide-react";

type Props = {
  message: string | null;
  onDismiss: () => void;
};

/** The live region is always mounted so screen readers announce each new message. */
export function Toast({ message, onDismiss }: Props) {
  return (
    <div className="ui-toast" role="status" aria-live="polite">
      {message && (
        <div className="ui-toast__card">
          <p className="ui-toast__message">{message}</p>
          <button
            type="button"
            className="ui-toast__dismiss"
            aria-label="Dismiss"
            onClick={onDismiss}
          >
            <X aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
