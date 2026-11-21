# VXNTA refactor changelog

Prepared with Codex AI assistance. This is a behavior-preserving, incremental refactor of the existing application, based on production `c120658`; it is not a new site design.

## Changes

- Production baseline, route inventory, browser screenshots and regression tests were recorded before runtime edits. The original checkout's unfinished work was copied to an external backup and left on its existing branch.
- Node 22, full application lint, strict checking of application TypeScript, consistent formatting, Husky/lint-staged and main-targeted CI are configured. Hooks reject invalid TypeScript and accept valid commits. Source LF rules and short Windows command batches make this work across operating systems. Production/CI installs skip development hook installation.
- Existing movie composition, artwork, constants, subtitle formatting and request validation are typed. Catalog values/order, recommendations, null coercion and error responses are compared with the immutable production implementation.
- Header is 94 lines, with typed navigation/account components and native UI primitives. Existing markup, links, colors, theme and logout behavior are retained.
- The single existing Turso store moves to `src/db/index.mjs`; all imports and legacy source readers follow it. Its SQL, schema/seeds, lazy-client behavior and data location are retained. Only the small payment-options API is converted to TypeScript in this server-side phase.
- Watch page is 185 lines. Existing access display, iframe player and episode controls are split into typed components. All five provider URLs, subtitle encoding, iframe remount keys and SceneChain integration remain covered by regression tests.
- Header/watch decode untrusted API responses with existing Zod. This does not replace server authorization. Public movie/user/payment/API/subtitle types contain no credentials.
- `main`'s existing nine-file classroom demo is preserved outside the root App Router. The later placement assessment stays separate on the original feature branch.
- Main protection was configured and verified through GitHub API: PR, one approving review, up-to-date `VXNTA quality`, including admins; force pushes/deletion disabled.

See [migration map](FILE_MIGRATION_MAP.md), [compliance](PINEBAATARS_COMPLIANCE.md), [test evidence](TEST_REPORT.md) and [Монгол суралцах хөтөч](PINEBAATARS_LEARNING_MN.md).

## Review scope

`main` predates the production application. The main-targeted PR consequently includes pre-existing production synchronization. For the newly authored refactor, review `git diff c120658..HEAD -- src scripts tests docs package.json eslint.config.mjs tsconfig.json .github .husky` and the conventional commits:

1. `4f9ccb0` — production baseline and regression tests.
2. `16645cc` — Node, formatting/lint, hooks and CI.
3. `0b9d59a` — shared types, catalog and utilities.
4. `92477b1` — Header and shared native primitives.
5. `06d1103` — central store location and payment-options response type.
6. `00ce502` — watch/learning typing, player contracts and payment mocks.

The production data files, original media, subtitle assets, route URLs, credentials and Render settings were not replaced. No database/authentication/payment service was introduced. Long legacy JS/MJS modules are explicitly deferred, not hidden behind `any` or suppressed TypeScript errors.

## Rollback / deployment

This branch does not advance `vercel-turso`, merge main or deploy Render. Before merge, closing the PR abandons the refactor while the running site remains on its existing production source.

After a future merge, make a rollback PR reverting the refactor commits in reverse order; retain the production synchronization and `main`'s isolated demo. Use `c120658b904a2942134f31323a54f78d414659b5` as the known production application baseline, rather than the older main app. Re-run the browser/store checks on the rollback branch.

Do not reset/delete databases, change secrets or force-push main as part of rollback. A production rollout or release rollback is a separate action requiring the deployment authorization specified in the task.
