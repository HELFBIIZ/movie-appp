# Pinebaatars compliance

Source: [official Pinebaatars standards](https://pinebaatars-stack.pineconegpt1.workers.dev/standards), read directly during the audit started 2026-11-21. This is a summary of the applied requirements, not a copy of the handbook. Prepared with Codex assistance.

| Requirement                   | Implementation / verification                                                                                                                                                                                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Node 22                       | Existing `.nvmrc` retained; `engines.node = 22.x`; CI uses Node 22. Local builds/tests use Node 22.23.5. Live Render process version cannot be inspected through public HTTP.                                                                                                                                |
| Folder responsibilities       | `src/app/api`, `components/learning`, `db`, `lib`, `types`; see `FOLDER_STRUCTURE.md`. One database store.                                                                                                                                                                                                   |
| Incremental strict TypeScript | Typed catalog/utilities, Header/native UI primitives, payment-options API and watch flow. No explicit `any`, `@ts-ignore` or unsafe assertions added. JS remains supported.                                                                                                                                  |
| Runtime validation            | Existing Zod validates API responses consumed by Header/watch. Existing request validation behavior is retained and compared against production.                                                                                                                                                             |
| ESLint                        | All `src` and tests; Next/TypeScript presets, no-explicit-any, no-unused-vars, eqeqeq, prefer-const, Rules of Hooks and exhaustive-deps. Console policy follows handbook: warnings except `console.error`; CI rejects warnings.                                                                              |
| Prettier                      | Single quotes, semicolons, width 100, trailing commas `all`. `format` and `format:check` cover source, tests, docs and selected tooling/configuration. Immutable media/generated data is excluded.                                                                                                           |
| Cross-platform consistency    | `.gitattributes` keeps source/config/docs and hooks in LF; original media/subtitle bytes are outside these rules.                                                                                                                                                                                            |
| Husky / lint-staged           | Existing hooks were inspected; no custom hook existed. Failed `any`/unused-variable probe rejected the commit without advancing HEAD; valid commits passed. Windows command batches are limited to 6000 characters and run sequentially. Existing non-Husky `core.hooksPath` is preserved by prepare script. |
| CI                            | `.github/workflows/ci.yml`: PRs to main; clean npm ci, lint, types, format, unit/store/payment tests, build, existing browser tests and fresh production-vs-refactor screenshot comparison. Browser evidence uploaded for 14 days.                                                                           |
| Environment                   | `.env.example` has 22 names with empty values; no real credentials copied. Private variables stay server-side.                                                                                                                                                                                               |
| Main protection               | Configured and re-read through GitHub API: PR + one approval, `VXNTA quality`, strict up-to-date checks, enforcement for admins, no force push or branch deletion.                                                                                                                                           |
| Review / rollout              | Conventional commits and a PR; production synchronization distinguished from new refactor work. Production deployment is a separate authorized action.                                                                                                                                                       |

## Lint exceptions and migration limits

The requested Hooks rules and exhaustive dependencies remain enforced. The newer React compiler's `set-state-in-effect` performance rule has line-specific annotations where changing mount/reset timing would change the production loading UI or media lifecycle. Four existing native-image sites retain line-specific `no-img-element` annotations to preserve external/receipt image behavior. These are visible migration debt, not global rule switches. Prettier's official ESLint compatibility preset only resolves formatting-rule conflicts.

The SQL/auth/payment core is retained in MJS/JS; it is not advertised as a completed whole-app TypeScript rewrite. Static data files may be long. Migrated Header/watch UI files are each under 200 lines. Real deployment access and authenticated film playback are outside the verified test evidence; see `TEST_REPORT.md`.

## Service boundaries

| Service                       | Current role / decision                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| Clerk                         | Existing OAuth identity bridge; current native session/role checks preserved.                   |
| Turso/libSQL                  | Existing structured application data; retained.                                                 |
| Wire.mn / QPay / bank         | Existing payments; request/signature tests use fixtures, no real charges.                       |
| Supabase + Drizzle            | No new structured-data feature justifies another store. Not connected or substituted for Turso. |
| Hugging Face / Pinecone / n8n | No new AI, retrieval or indexing feature in this behavior-preserving PR.                        |
| Facebook Graph API            | No authorized Page workflow requested; no connection or publishing.                             |

SceneChain's existing progress, vocabulary, local media import and original lesson remain in the existing application. The separately authored placement assessment stays on the original feature branch. New features and authorized-media indexing can be reviewed independently after this refactor.
