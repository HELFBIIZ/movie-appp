# Refactor verification report

Production comparison base: `c120658b904a2942134f31323a54f78d414659b5`. Local runtime: Node 22.23.5, Windows, cached Chromium 1248, one browser worker. CI uses Node 22 and its installed Chromium; it builds both versions afresh on the same runner rather than comparing Linux pixels with Windows snapshots.

## Recorded results

| Check                                         | Before refactor                                                 | After refactor                                                                                |
| --------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Production build                              | Passed                                                          | Passed, all existing routes generated                                                         |
| Build route manifest                          | Saved                                                           | All 53 entries identical                                                                      |
| Original learning unit tests                  | 17/17                                                           | 17/17 (included in full suite)                                                                |
| Full unit/parity/store/payment/contract suite | Baseline parity/store checks passed                             | 26/26                                                                                         |
| ESLint                                        | Scoped learning check passed                                    | All app source, tests and new tooling pass with zero warnings                                 |
| TypeScript                                    | Learning-only scope passed                                      | Every application TS/TSX file, browser test and Playwright configuration passes strict checks |
| Formatting                                    | Windows checkout failed on 36 files, including CRLF differences | Final format check passed; source LF rules added                                              |
| Original browser suite                        | 12/12                                                           | 12/12 in the complete final rerun                                                             |
| New browser regression suite                  | 15/15 against cached immutable baseline build                   | 15/15 in complete final rerun                                                                 |
| Before/after screenshots                      | 20 captures                                                     | All 20 comparisons pass with `maxDiffPixels: 0`                                               |
| Husky                                         | No custom existing hook                                         | Invalid TS commit rejected; valid migration commits passed                                    |
| Original unfinished checkout                  | 15 files externally backed up                                   | All 15 file hashes still identical to the initial backup                                      |
| Main protection                               | Previously unprotected                                          | PUT and independent GET confirm PR, one review and required `VXNTA quality`                   |

The first post-refactor Windows visual run lost a worker with exit `3221226505`. The dark-mode case passed alone, and the complete 15-test run passed with a 768 MB Node heap limit. Assertions were not skipped or loosened. An older movie-entry test waited for external images/frames at full page load; its navigation now waits for DOMContentLoaded and retains all existing UI assertions. The complete original 12-test suite then passed. Initial harness assumptions were corrected against the actual baseline (notably anonymous favorites are HTTP 200 with an empty list).

Local dependency extraction used `npm ci --ignore-scripts`; normal `npm ci`, including lifecycle behavior, is required in GitHub CI. The PR checks are the authoritative remote results; no production deploy is part of these workflows.

## Coverage and side effects

| Surface                                                 | Evidence                                                                                                                                                                      |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home, catalog, details, watch, login, pricing, `/learn` | Desktop/mobile screenshot comparisons, fixed browser date/locale/timezone                                                                                                     |
| Search/navigation                                       | Existing Inception result, category link and mobile menu URLs                                                                                                                 |
| Theme / account UI                                      | Light/dark snapshots; mocked login failure/success, admin visibility, logout and profile PATCH payload                                                                        |
| Five players                                            | All selectable iframe origins and exact URL parity for movie/TV, missing ID, zero season fallback and subtitle encoding                                                       |
| Real guest HTTP gates                                   | Auth/me, profile and admin return 401; favorites 200/empty; guest watch/checkout POST 401; checkout GET 405                                                                   |
| Public APIs                                             | Plans 200/nonempty; payment-options retains environment-derived bank/qpay/demo booleans                                                                                       |
| Existing SQL operations                                 | Disposable SQLite: signup/duplicate email, password verification, session, role denial, logout, profile, favorites, VIP activation, payment idempotency and rate limiting     |
| Wire/QPay                                               | Signature/token tamper rejection; intent/checkout/poll request payloads with mocked fetch; pending rows never classified paid                                                 |
| SceneChain                                              | VTT sanitization/alignment, local original video playback/seek, word/sentence saving, quiz, SRS, storage corruption/quota handling, provider message/source/origin validation |
| File integrity                                          | No committed changes to movie JSON, original media, subtitles, SQL schema/seeds or database files                                                                             |

Database tests create a temporary CWD with copied schema/seeds, remove remote DB environment variables and prohibit all network fetches. They never open the original checkout or a Turso production connection. Browser account/payment writes are fixtures. Real guest POST checks stop at the authentication gate, before history/XP/payment writes. Provider frames are aborted or explicit protocol fixtures; the original local lesson is used for actual video-clock tests.

## Screenshot evidence

Local full matrices: `.refactor-evidence/baseline/` and `.refactor-evidence/after/`. CI uploads these directories and failure traces as `refactor-browser-evidence` for 14 days. Representative pairs are committed under `docs/evidence/` and linked in the PR.

| View                     | Before                                    | After                                   |
| ------------------------ | ----------------------------------------- | --------------------------------------- |
| Watch guest gate         | [before](evidence/watch-before.png)       | [after](evidence/watch-after.png)       |
| Mobile homepage          | [before](evidence/home-mobile-before.png) | [after](evidence/home-mobile-after.png) |
| Existing learning lesson | [before](evidence/learning-before.png)    | [after](evidence/learning-after.png)    |

External artwork is replaced by the same fixture for deterministic UI comparisons; videos/iframes are masked. Catalog/artwork URLs and generated fallback SVGs are independently compared with production data. This verifies preserved interface rendering, not third-party media availability.

## Reproduce

Use Node 22, then:

```sh
npm ci
npm run lint
npm run typecheck
npm run format:check
npm test
npm run build
npx playwright install chromium
npm run test:browser
npm run test:visual
```

`test:visual` creates a verified temporary worktree at the immutable production commit, installs/builds it, captures baseline screenshots, stops that server and compares the refactor. Cleanup targets only its own temporary directory. The current application must already be built. For Windows with an existing browser installation, set `SCENECHAIN_CHROMIUM_PATH`; for local memory pressure, set `NODE_OPTIONS=--max-old-space-size=768` for the test command. `test:regression` reuses an existing local baseline; CI always generates a fresh one.

Stop the owned local application server before commits: the original repository tracks SQLite WAL/SHM files, and an open Windows database handle can prevent a Git stash restore. Do not reset the original user checkout or database.

## Limits

- Live read-only HTTP checks observed `/learn` 200, `/watch/spider-man-brand-new-day` 200 and `/api/auth/me` 401. Live homepage browser capture timed out during navigation; local before/after screenshots are the visual evidence.
- Render's authenticated control plane, live Node process version and production database were not available for inspection. Production source identification evidence and its limits are in `REFACTOR_BASELINE.md`.
- Real authenticated Spider-Man film playback, film identity/rights, EN/MN edition synchronization, merchant settlement and a live user login were not verified. Mocked provider/payment/account tests do not establish those facts.
- SQL/auth/payment core migration remains incremental JS/MJS. No TypeScript error suppression was used to claim a whole-app rewrite.
