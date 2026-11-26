# SceneChain learning and Wire release

Requested on 2026-11-23 for the existing VXNTA Render application. This extends the deployed app; the earlier behavior-preserving TypeScript refactor remains recorded in `REFACTOR_BASELINE.md` and its original Git history.

## Learning flow

- Every watch route starts learning with that title, not the sample film. Supported CineSrc movies and TV episodes use a validated, frame-bound clock. Entering learning selects CineSrc automatically. Other providers remain selectable for ordinary viewing.
- EN/MN captions resolve on demand using existing files, administrator uploads, or OpenSubtitles. Show IDs use `parent_tmdb_id` plus season and episode; downloaded candidates must match identity and language. Provider editions still need manual timing checks. Settings and saved notes are scoped by movie or episode.
- Missing captions never become invented dialogue. Users can choose another subtitle release or open their own EN/MN VTT and local video. The original free `/learn` lesson remains clearly labelled as an authored exercise.
- First entry offers an optional eight-question test. Results recommend beginner/foundation/intermediate learning settings. This is a short vocabulary, grammar and reading estimate, not a certified CEFR or speaking/listening assessment. Retests retain history; familiarity with repeated questions affects scores.
- `/learning` shows saved words, spaced repetition, review accuracy, test history and observed listening time. Seeks, stalled clocks and hidden tabs do not add minutes. The dashboard compares review windows only when each has enough observations; watching time is not claimed as proof of language improvement.
- Guests retain browser progress, including the legacy vocabulary storage. Account progress uses a separate namespace and the existing database. Anonymous data is not automatically attached to a signed-in account. Server writes use revisions; conflicts preserve local data and offer an explicit union of saved cards and test history. Local storage failures never report a successful save.
- Administrators can upload matching EN/MN VTT from the existing `/admin` page. Uploads use the existing database and remain separate from provider caches. Existing subtitle assets are not rewritten by this release.

## Subtitle coverage and limits

The checked-in manifest has 690 subtitle entries; 450 declare a partial translation or a translated-line ratio below 98%. These are available assets, not proof that every film or every TV episode has a complete Mongolian track. The UI exposes partial or missing captions. OpenSubtitles API metadata searches were verified using the existing local configuration, including exact English and Mongolian matches for Inception. Download quotas, provider availability and matching video editions still apply. No bulk downloads were run.

Translation failures retain explicit partial status. An unchanged English source is not saved as a completed Mongolian translation. Translation requests require a signed-in account with access to the title and accept only the application's stored subtitle sources; arbitrary remote URLs are rejected.

## Verified coverage

The static catalog audit found 1,710 unique title slugs and 690 base-title subtitle assets. There are no episode-specific checked-in VTT entries; TV episodes therefore use exact episode searches or matching administrator/user files. Titles without a stream identifier expose their own-video learning entry. Introductory dictionary glosses are authored in the app and require contextual confirmation; unknown meanings remain editable rather than invented.

Local end-to-end verification retrieved a real 117,810-character English subtitle through OpenSubtitles and opened the existing 122,548-character Mongolian subtitle for Inception. This used a temporary localhost account and isolated database, created no payment, and does not establish film playback or subtitle alignment.

## Wire flow

Official contract: <https://docs.wire.mn/en/docs/quickstart>.

1. An authenticated checkout looks up the server's plan price and creates/reuses an owned request using an idempotency key.
2. The server creates a PaymentIntent and hosted checkout session. The browser navigates to the validated `https://pay.wire.mn/c/...` URL.
3. The signed webhook accepts Wire's actual `event.data` PaymentIntent envelope. HMAC validation includes a five-minute timestamp limit.
4. Webhook handling and owned status polling retrieve the PaymentIntent server-side and compare provider ID, amount, currency and reference. A redirect alone never activates VIP.
5. A single atomic database batch records fulfillment, grants the subscription, marks the payment successful and logs the event. Concurrent retries grant once; distinct renewals stack expiry.
6. The return page waits for confirmed payment, then links to the requested movie/learning route. Missing configuration, pending payment and gateway errors remain distinct from success. Production rejects `local_dev` grants before creating a payment row and hides the demo purchase button.

Wire uses real-money live keys; its official API does not provide a test-key sandbox. Protocol and UI tests use explicit fixtures and never charge. The checked local environment contains OpenSubtitles/Clerk settings, but no Wire or Turso settings at inspection time. Values were not printed or committed. Real paid settlement and Render merchant configuration cannot be inferred from passing mocked tests.

## Data and rollout

The existing database client is retained. Additive tables are created lazily: `learning_states`, `learning_captions`, `payment_fulfillments`, and `checkout_requests`. No users, subscriptions or existing catalog/subtitle files are reset. Production requires durable database storage for learning and payment records. Local verification uses an isolated database under the ignored evidence directory, never the user's working database.

Before release, run Node 22 lint, TypeScript, formatting, unit tests, production build and browser tests. Browser evidence distinguishes real local account/API tests, native exercise media, mocked player/payment protocol checks, and any public live checks. A successful mock checkout is not a real movie playback or settlement verification.

The visual baseline for this feature release must reflect the intentionally requested test, dashboard, navigation and payment changes. Keep the original refactor baseline available in Git history; do not claim the new screens are identical to the old refactor UI.

The visual baseline is pinned to `9be9a4c53051cf62b72cdfa2335ca3f519ceef49` for the requested compact navigation, Mongolian word coach, simpler dashboard/auth/payment forms, and removal of the free exercise. CI rebuilds that implementation and the proposed head in the same browser and compares screenshots without a pixel tolerance, including word teaching and its quick check on desktop/mobile. Earlier guided-practice (`1fd0c15e6ba55a0fc40d175d32e58bc7ae10b133`), feature (`1771883174ed100d409b9822f5338b86939ceee9`) and refactor (`de51971`) baselines remain in Git history. The quality job runs for release PRs targeting `vercel-turso`.

`/learn` redirects to `/movies`; original sample media lives only in test fixtures. Existing saved cards remain reviewable. Word teaching uses authored Mongolian explanations and contextual phrase/sense rules. Unknown words and explicitly selected missing-MN sentences use authenticated, cached MyMemory lookups (official [GET contract](https://mymemory.translated.net/doc/spec.php), [terms](https://mymemory.translated.net/terms-and-conditions)). A sentence request contains only that short segment, not a transcript or account information. Before requesting it, the UI explains that the sentence is sent to MyMemory. Automatic meanings are labeled and carried into the selected word's context.

Both endpoints share one atomic 3,000-byte/character daily app budget, below the provider's [anonymous allowance](https://mymemory.translated.net/doc/usagelimits.php). Sentence input is limited to 400 UTF-8 bytes and one paragraph, the JSON reader caps its stream at 4 KB, each user can request 20 sentences per five minutes, equal in-flight requests are coalesced and successful meanings are cached for 30 days. Existing MN text requires no request. Neither quota exhaustion nor failure invokes a paid fallback; this is not unlimited full-film caption generation. Native English pronunciation is enabled only when the browser supplies an English voice.

Wire's [authentication documentation](https://docs.wire.mn/en/docs/concepts/authentication) says test-mode keys are unavailable. Money-free verification covers read-only routing/settlement readiness plus isolated database/signature/idempotency and mocked browser checkout tests. It does not create live payment intents or grant fake production VIP and cannot certify real settlement without a real payment.

Browser fixtures verify UI and protocol behavior; they do not verify real film content or paid settlement. Complete MN tracks still require actual caption sources or available translation credits. See [guided learning details](GUIDED_LEARNING.md) for the subtitle-service limitations.

This release updates Next.js and its ESLint configuration to 16.4.6, sharp to 0.35.5 and source-map-js to 1.2.4. The production dependency audit reports zero advisories on 2026-11-24; CI checks production dependencies for high/critical advisories. See the [Next.js release](https://github.com/vercel/next.js/releases/tag/v16.4.6) and [upstream image optimization advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw). The UI comparison retains the preceding feature implementation to catch visible regressions from the dependency update.
