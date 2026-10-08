import "./paint-toggles.css";

import { useUser } from "@clerk/react";
import { Bookmark, Heart, Plus } from "lucide-react";

import { useQueueAfterSignIn, useSignIn } from "@/features/auth/sign-in-provider";
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
  const queueAfterSignIn = useQueueAfterSignIn();
  const { isSignedIn } = useUser();
  const toast = useToast();
  const online = useOnlineStatus();

  const apply = (change: FlagChange) => {
    if (canSave) setFlags(paintId, change);
    // Signed in, but Convex's authenticated connection is still starting (right after a load).
    else if (isSignedIn) queueAfterSignIn({ paintId, change });
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
