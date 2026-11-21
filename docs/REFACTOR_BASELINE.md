# VXNTA refactor baseline

Audit date: 2026-11-21 (Asia/Ulaanbaatar). Prepared with Codex; AI assistance is explicit.

## Source and preservation

Repository: https://github.com/HELFBIIZ/movie-appp

Live application: https://vxnta-movie-app.onrender.com

| Reference               | Commit                                     | Findings                                                                                |
| ----------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------- |
| `main`                  | `2405c1c12ca69607783ef9703182c141d70ef952` | Old root app, six routes; also contains the isolated classroom demo. Not the live site. |
| `feat/scenechain-watch` | `e52c4a2df01ae8bc51dadc73f6e1f6a3caa1a27a` | Full account/payment/movie application and initial learning dock; lacks `/learn`.       |
| `vercel-turso`          | `c120658b904a2942134f31323a54f78d414659b5` | Production baseline: full site, actual-movie learning integration, `/learn`.            |
| Original working branch | `f77f8937924b8b7b9981a26d006d964154cdd899` | Later assessment feature; preserved separately and excluded from this refactor.         |

Production-source identification uses the existing production branch, previously observed Render auto-deploy, and live asset/route inspection. Live `/learn` contains the original guided lesson. The watch bundle contains `englishSubtitleUrl` but does not contain the later `vxnta:learning-open` assessment event. Render's authenticated control plane is unavailable; no Render service setting was changed or claimed inspected. Environment-dependent clean-build chunk hashes differ, so those hashes alone are not presented as proof of a byte-identical deployment.

Live watch asset at audit:
`/_next/static/chunks/app/watch/%5Bslug%5D/page-7a3da5287a7868b6.js`,
SHA-256 `78106a0deeee49282a73ca50da7de61e0bafe3b4088bbb3c02000eb296eccdc4`.

Local safety reference: `backup/pre-pinebaatars-20261121` points to the original `f77f893` HEAD. Before editing, binary/index patches and copies of all 15 dirty/untracked files were saved outside the repository. The snapshot's manifest records matching before/after SHA-256 hashes. The original checkout, credentials and database remain untouched. Work happens in a separate worktree on `refactor/pinebaatars-typescript-20261121`, starting at production `c120658`.

`main` is substantially behind production (903 changed files, mostly pre-existing catalog/subtitle/application work). Its isolated `scenechain-demo/` files must also survive the eventual PR. Review the refactor separately with `git diff c120658..HEAD -- src` and the migration map; do not mistake the production synchronization for newly authored features.

## Existing runtime contract

- Next.js 16.3.3 App Router, React 19.2.8, Tailwind 4, React compiler.
- Node 22 is already requested by `.nvmrc`. Baseline verified on Node 22.23.5. Render's live Node process version cannot be inspected through public HTTP.
- One libSQL/Turso store (`src/lib/db.mjs`), local SQLite fallback under `data/db`, existing SQL schema/seeds. No database replacement or schema migration is authorized here.
- Custom `mn_session` authentication, scrypt passwords, existing Clerk OAuth bridge and server role/VIP checks.
- Existing Wire.mn, QPay and manual receipt flows. No real payment submission is part of testing.
- Five iframe players remain VidSrc, CineSrc, SuperEmbed, EmbedMaster and Embed API. Guest watch POST returns 401. Playback permission remains a server decision.
- SceneChain: local/browser vocabulary and SRS, local video/VTT import, original `/learn` lesson, real movie subtitle/provider adapter. No assessment feature is added in this branch.

## Route inventory

Pages: `/`, `/admin`, `/admin/payments`, `/admin/users`, `/genre/[slug]`, `/help`, `/learn`, `/login`, `/movie/[slug]`, `/movies`, `/pricing`, `/profile`, `/streaming`, `/watch/[slug]`, `/watchlist`; existing robots, sitemap, favicon and Next error routes.

API routes: `/api/actions/redeem`, `/api/admin/{overview,payments,users}`, `/api/auth/{clerk,login,logout,me,register}`, `/api/checkout`, `/api/cron/qpay`, `/api/envtest`, `/api/favorites`, `/api/movies`, `/api/notifications`, `/api/notifications/read`, `/api/payment-options`, `/api/payments/manual`, `/api/plans`, `/api/profile`, `/api/qpay/status`, `/api/rewards`, `/api/stream/tmdb`, `/api/subtitles`, `/api/subtitles/mongolian/[slug]`, `/api/subtitles/source/[id]`, `/api/subtitles/translate`, `/api/subtitles/translated/[id]`, `/api/watch/[slug]`, `/api/watchmode/sources`, `/api/webhooks/{bank,qpay,wire}`.

## Before-change checks

| Check                       | Baseline result                                                                                                                                |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Clean dependency extraction | `npm ci --ignore-scripts --prefer-offline --no-audit --no-fund` succeeded (460 packages); full lifecycle install is separately required in CI. |
| Build                       | Passed on Node 22, `next build --webpack`; all existing routes generated.                                                                      |
| Existing unit tests         | 17/17 passed.                                                                                                                                  |
| Existing scoped lint        | Passed; previously covered only learning code and disabled `set-state-in-effect`.                                                              |
| Existing typecheck          | Passed; previously included only learning TypeScript.                                                                                          |
| Existing format check       | Failed on 36 files. Recorded debt, not a new refactor regression.                                                                              |
| Browser / screenshots       | See the completed runs and evidence paths in `TEST_REPORT.md`. Capture tooling is added before runtime edits.                                  |

Deterministic screenshots use the same browser, fixed date, viewport, locale, fonts and fixture artwork before/after. Artwork and third-party playback are separately checked through URL/behavior assertions. Existing learning tests exercise the actual original local video. The live read-only capture script is supplementary and does not authenticate or mutate accounts.

Real authenticated Spider-Man playback, media identity/rights, EN/MN edition alignment and real payment settlement have not been verified. Mocked UI/provider tests do not establish those facts.

## Reproduce / rollback

Use Node 22, `npm ci`, `npm run build`, and the documented checks in `TEST_REPORT.md`. Compare the immutable production base with this branch. Close/revert this PR to abandon the refactor; production was not deployed. Do not reset the original user checkout, database or the separate assessment branch.
