import "./my-paints-screen.css";

import { useUser } from "@clerk/react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { useSignIn } from "@/features/auth/sign-in-provider";
import {
  COLLECTION_VIEW_LABELS,
  COLLECTION_VIEWS,
  type CollectionView,
  collectionView,
  type FilterParams,
  type Filters,
} from "@/features/catalog/filters";
import { PaintsScreen } from "@/features/catalog/paints-screen";
import { useOnlineStatus } from "@/features/pwa/use-online-status";

import { useCollection } from "./collection-provider";

type Props = {
  tab: CollectionView;
  query: string;
  onQueryChange: (query: string, options: { replace: boolean }) => void;
  filterParams: FilterParams;
  onFiltersChange: (filters: Filters) => void;
  onClearAll: () => void;
};

const EMPTY_MESSAGES: Record<CollectionView, string> = {
  owned: "You haven't added any paints yet",
  wishlist: "Nothing on your wishlist",
  favorites: "No favorites yet",
};

/** UX_FLOWS Flow 6: the catalog search, scoped to one part of the collection (DECISIONS 031). */
export function MyPaintsScreen({ tab, ...searchProps }: Props) {
  const { isLoaded, isSignedIn } = useUser();
  const collection = useCollection();
  const online = useOnlineStatus();
  const openSignIn = useSignIn();

  if (isLoaded && !isSignedIn) {
    return (
      <section className="my-paints__message">
        <p>Sign in to see the paints you own and want, on any device.</p>
        {online ? (
          <Button onClick={() => openSignIn()}>Sign in</Button>
        ) : (
          <p className="my-paints__note">Signing in needs an internet connection.</p>
        )}
      </section>
    );
  }

  // Clerk never loads offline; the collection still answers from the device for the stored user.
  if (collection.loading) return <SkeletonRows />;

  const scope = collectionView(tab, collection);

  return (
    <div className="my-paints">
      <nav className="my-paints__tabs" aria-label="Collection">
        {COLLECTION_VIEWS.map((view) => (
          <TabLink
            key={view}
            tab={view}
            current={tab}
            count={collectionView(view, collection).size}
            label={COLLECTION_VIEW_LABELS[view]}
          />
        ))}
      </nav>
      <PaintsScreen
        {...searchProps}
        scope={scope}
        hideShow
        emptyScope={
          <section className="my-paints__message">
            <p>{EMPTY_MESSAGES[tab]}</p>
            <Button asChild variant="outline">
              <Link to="/paints">Browse paints</Link>
            </Button>
          </section>
        }
      />
    </div>
  );
}

function TabLink({
  tab,
  current,
  count,
  label,
}: {
  tab: CollectionView;
  current: CollectionView;
  count: number;
  label: string;
}) {
  return (
    <Link
      to="/my-paints"
      search={{ tab }}
      className="my-paints__tab"
      // Set explicitly: the default tab has no ?tab= in the URL, so router matching alone misses it.
      activeOptions={{ includeSearch: true, exact: true }}
      activeProps={{}}
      aria-current={tab === current ? "page" : undefined}
      data-current={tab === current || undefined}
    >
      {label} ({count})
    </Link>
  );
}

function SkeletonRows() {
  return (
    <div className="my-paints">
      <p className="my-paints__note" role="status">
        Loading your paints…
      </p>
      <ul className="my-paints__skeleton" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <li key={i} className="my-paints__skeleton-row" />
        ))}
      </ul>
    </div>
  );
}
