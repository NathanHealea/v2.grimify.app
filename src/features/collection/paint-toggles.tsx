import "./paint-toggles.css";

import { Bookmark, Heart, Plus } from "lucide-react";

import { useSignIn } from "@/features/auth/sign-in-provider";
import { useToast } from "@/features/feedback/toast-provider";
import { useOnlineStatus } from "@/features/pwa/use-online-status";

import { usePaintFlags } from "./collection-provider";
import { type FlagChange, useCanSavePaints, useSetPaintFlags } from "./use-set-paint-flags";

type Props = {
  paintId: string;
  paintName: string;
};

/** Own, Want and Favorite, independent (DECISIONS 011, 033); signed out, a tap opens sign-in and finishes afterwards. */
export function PaintToggles({ paintId, paintName }: Props) {
  const flags = usePaintFlags(paintId);
  const canSave = useCanSavePaints();
  const setFlags = useSetPaintFlags();
  const openSignIn = useSignIn();
  const toast = useToast();
  const online = useOnlineStatus();

  const apply = (change: FlagChange) => {
    // Known user, even offline or before Convex connects: the outbox sends it later.
    if (canSave) setFlags(paintId, change);
    // Clerk's sign-in loads from its servers, so offline there is nothing to open.
    else if (!online) toast("Signing in needs an internet connection.");
    else openSignIn({ paintId, change });
  };

  return (
    <div className="paint-toggles">
      <button
        type="button"
        className="paint-toggles__button"
        aria-pressed={flags.owned}
        aria-label={`Mark ${paintName} as owned`}
        onClick={() => apply({ owned: !flags.owned })}
      >
        <Plus aria-hidden="true" />
      </button>
      <button
        type="button"
        className="paint-toggles__button"
        data-kind="want"
        aria-pressed={flags.wishlisted}
        aria-label={`Mark ${paintName} as wanted`}
        onClick={() => apply({ wishlisted: !flags.wishlisted })}
      >
        <Bookmark aria-hidden="true" />
      </button>
      <button
        type="button"
        className="paint-toggles__button"
        data-kind="favorite"
        aria-pressed={flags.favorite}
        aria-label={`Mark ${paintName} as favorite`}
        onClick={() => apply({ favorite: !flags.favorite })}
      >
        <Heart aria-hidden="true" />
      </button>
    </div>
  );
}
