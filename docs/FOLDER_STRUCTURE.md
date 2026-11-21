# VXNTA folder guide

```text
src/
  app/                   Next.js pages, layouts and existing route URLs
    api/                 HTTP handlers; existing authentication/payment decisions
  components/
    header/              Desktop/mobile navigation and account controls
    watch/               Access message, existing iframe player, episode selection
    learning/            SceneChain UI and browser media/storage hooks
    ui/                  Shared native button/dropdown primitives
  db/
    index.mjs            The single existing libSQL/Turso store, server-only
  lib/
    catalog/             Existing curated data and fallback SVG artwork
    watch/               Pure URL builders for the five existing providers
    learning/            Caption parsing, SRS, progress and player protocol logic
    contracts.ts         Zod decoding for untrusted API responses used by UI
    movies.ts            Catalog composition, lookup, filtering and recommendations
    validate.ts          Existing request-validation semantics, now typed
    xp.mjs               Existing XP ledger, using the same database client
  types/                 Shared public movie, user, payment, API and subtitle types
data/db/                 Existing schema/seeds and local database fallback
tests/                   Unit, isolated database, payment mock and browser tests
scripts/                 Existing maintenance CLI tools and new verification tooling
```

The database still reads schema/seeds relative to the application CWD. Moving its source does not relocate data or create another client/store. Private database and payment credentials stay on the server.

`src/lib/learning/types.ts` remains local to that feature; shared site types live in `src/types`. Static catalog data may exceed 200 lines. Migrated UI components are under 200 lines.

`scenechain-demo/` is existing work from `main`, preserved outside the root App Router. It is not a replacement site or an additional runtime service. The later placement-test feature remains on the original feature branch.
