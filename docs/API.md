# API Documentation

> Status: **Draft v0.2**
> The app has no REST API. The "API" is (1) the static catalog file and (2) Convex functions called through the typed Convex client (`useQuery` / `useMutation`).

## 1. Static Catalog

### GET /catalog.json

Authentication:
None (public)

Caching:
Service worker: stale-while-revalidate. CDN: long cache with a content-hash query string (`/catalog.json?v=<hash>`).

Response:
```json
{
  "version": "a1b2c3d4",
  "brands":   [{ "id": "citadel", "name": "Citadel", "manufacturer": "Games Workshop" }],
  "lines":    [{ "id": "citadel-base", "brandId": "citadel", "name": "Base" }],
  "paints": [
    {
      "id": "citadel-base-mephiston-red",
      "brandId": "citadel",
      "lineId": "citadel-base",
      "name": "Mephiston Red",
      "hex": "#9A1115",
      "lab": [31.2, 50.1, 33.4],
      "hue": "red",
      "value": "dark",
      "type": "base",
      "finish": "matte"
    }
  ]
}
```
(Example values are illustrative. The schema is in DATABASE.md §3.)

---

## 2. Convex Functions

All functions live in `convex/`. Every function except where noted calls `requireUser(ctx)`, which throws `UNAUTHENTICATED` if there's no identity.

### users.store — mutation
Authentication: Required
Purpose: Create the `users` row for the current identity if it doesn't exist (called once after sign-in). Returns the user ID. Idempotent.
Args: none
Returns: `Id<"users">`

### users.me — query
Authentication: Optional (returns `null` when signed out)
Returns:
```ts
{ _id: Id<"users">; name?: string; email?: string } | null
```

### users.deleteAccount — mutation
Authentication: Required
Purpose: Delete all of the user's `userPaints` and their `users` row. (The auth-provider account is deleted separately through the provider's API or UI.)
Returns: `null`

### userPaints.listMine — query
Authentication: Required (returns `[]` when signed out, so the UI doesn't error)
Args: none
Returns:
```ts
Array<{ paintId: string; owned: boolean; wishlisted: boolean; updatedAt: number }>
```

### userPaints.set — mutation
Authentication: Required
Args:
```ts
{
  paintId: string;
  owned?: boolean;        // omit to leave unchanged
  wishlisted?: boolean;   // omit to leave unchanged
  clientUpdatedAt: number; // ms timestamp of when the user made the change (may be in the past if queued offline)
}
```
Behavior:
- Look up the row via `by_user_paint`
- If the row exists and `row.updatedAt > clientUpdatedAt` → ignore (a newer change already won; last-write-wins)
- Otherwise apply the provided flags and set `updatedAt = clientUpdatedAt`
- If no row exists → insert (missing flags default to `false`)
- If both flags end up `false` → delete the row
- Idempotent: replaying the same call has no further effect
Validation:
- `paintId` matches `^[a-z0-9-]{3,100}$`
- At least one of `owned` / `wishlisted` is provided
- `clientUpdatedAt` is not more than 5 minutes in the future (clock-skew guard)
Returns: `null`

---

## 2b. Offline Outbox (client)

Own/Want changes made offline are queued and replayed (DECISIONS 010):
- Each toggle writes `{ paintId, owned?, wishlisted?, clientUpdatedAt }` to an IndexedDB outbox (`idb-keyval`) **and** updates the local cached collection immediately
- When online (and signed in), the outbox is flushed in order by calling `userPaints.set`; entries are removed only after success
- Multiple queued changes to the same paint are collapsed to the latest one before sending
- The UI shows a small "n changes waiting to sync" indicator while the outbox isn't empty
- Sign-out with a non-empty outbox → warn the user before discarding

## 3. Error Format

Convex functions throw `ConvexError` with a structured payload:
```ts
throw new ConvexError({ code: "UNAUTHENTICATED", message: "Sign in to save paints" });
```

| code | Meaning |
|---|---|
| `UNAUTHENTICATED` | No signed-in user |
| `INVALID_ARGUMENT` | Argument failed validation |
| `NOT_FOUND` | Referenced record doesn't exist |
| `RATE_LIMITED` | Too many requests (if rate limiting is added) |
| `INTERNAL` | Unexpected error (details are never exposed) |

The client maps `code` to a user-facing message (see ERROR_HANDLING.md when it's written).

---

## 4. API Rules

- Validate all arguments with Convex validators (`v.*`)
- Authenticate every function that touches user data
- Authorize by deriving `userId` from the auth identity. **Never accept `userId` as an argument.**
- Return consistent `ConvexError` payloads
- Don't expose internal details (stack traces, IDs of other users)
- Queries must use indexes (`withIndex`), never `.filter()` on whole tables
- Keep functions small; shared logic goes in `convex/lib/`
