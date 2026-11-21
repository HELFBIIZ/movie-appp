# Incremental file migration map

Production comparison base: `c120658b904a2942134f31323a54f78d414659b5`.

| Previous file                          | Current responsibility / destination                                                                                  | Behavior preserved                                                                             |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/lib/movies.js`                    | `src/lib/movies.ts`, `catalog/curated.ts`, `catalog/art.ts`                                                           | Complete catalog values/order, fallback art, filters and recommendations                       |
| `src/lib/const.js`                     | `src/lib/const.ts`                                                                                                    | Frozen constant values, including existing legacy provider list                                |
| `src/lib/subtitles-format.js`          | `src/lib/subtitles-format.ts`; `src/types/subtitle.ts`                                                                | Existing cue/timestamp formatting; no caption rewrite                                          |
| `src/lib/validate.mjs`                 | `src/lib/validate.ts`                                                                                                 | Empty values, Number coercion, stateful RegExp, first-error order and 400 response             |
| `src/components/Header.js`             | `Header.tsx`, `header/{navigation,DesktopNavigation,MobileNavigation,AccountControls}.tsx`                            | Same DOM, links, classes, theme, role visibility and logout request                            |
| `src/components/ui/button.js`          | `src/components/ui/button.tsx`                                                                                        | Same native element, styles, variants and spread attributes                                    |
| `src/components/ui/dropdown-menu.js`   | `src/components/ui/dropdown-menu.tsx`                                                                                 | Same context, child cloning, outside click, Escape and alignment                               |
| `src/lib/db.mjs`                       | `src/db/index.mjs`                                                                                                    | Byte-identical store at move commit; same SQL, lazy client, CWD data paths and guards          |
| `src/app/api/payment-options/route.js` | `src/app/api/payment-options/route.ts`                                                                                | Same `/api/payment-options` URL and three environment-derived booleans                         |
| `src/app/watch/[slug]/page.js`         | `page.tsx`; `components/watch/{MoviePlayer,WatchAccessGate,EpisodeSelector,useWatchAccess}`; `lib/watch/providers.ts` | Same gate states, five iframe providers, subtitle panel, episode remount key and learning dock |

Shared types are in `src/types/{movie,user,payment,api,subtitle}.ts`. API response decoding is in `src/lib/contracts.ts`. Zod is an existing dependency; no additional identity, payment or database service was introduced.

All affected relative database imports were updated (26 callers). Legacy source-repair/probe readers also follow the moved store; they were not executed. Four maintenance scripts that read the curated catalog source now follow `catalog/curated.ts`; the poster script also points its optional module import at `movies.ts`. They were not run against external catalogs or subtitle services during the refactor.

TMDB identifiers in existing JSON can be strings or numbers. Types describe both; identifiers are not coerced and CineSrc's existing matching rules are unchanged. Null ratings retain JavaScript's previous numeric coercion in ranking functions.

Global source formatting, removal of unused bindings, explicit null checks and complete hook dependencies were committed separately from the typed component migrations. Native `<img>` elements and lifecycle reset timing have narrowly scoped, explained lint annotations; no global semantic check is disabled.

## Deliberately incremental

Authentication handlers, payment/webhook handlers, the SQL store and large legacy subtitle/player components remain JavaScript/MJS where conversion would expand risk. `allowJs` supports this transition; strict checking covers every application TypeScript file, browser tests and Playwright configuration. Remaining JavaScript is still linted.

No route, schema, database content, video provider, media asset or production secret was replaced. `main`'s isolated classroom demo and the original checkout's unfinished work remain separate and preserved.
