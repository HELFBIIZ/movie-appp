# Guided learning release

The default learning tab now presents one English subtitle at a time. A learner listens, reveals the matching Mongolian cue, selects a word, and practices recalling it. The complete transcript remains under **Хадмал**. Missing Mongolian text stays visibly missing.

Native video supports a sentence end stop, optional repeat and 0.75× speed. CineSrc sentence replay waits for an actual seek acknowledgement from the bound iframe before sending play; real clock events stop or repeat the sentence. Source changes, page/tab unmounts, manual pauses and seek timeouts cancel replay. Unsupported iframe controls do not acquire invented capabilities. Native introductory video remains explicitly an authored exercise, separate from movie content.

Recall exercises hide exact word occurrences in the saved context and grade the typed English answer once per card. Revealing an answer counts as forgotten. Existing spaced review scheduling and account synchronization record real answers. Daily plans recommend 3/5/8 words according to the placement estimate, one minute listening and up to five reviews. Streaks use actual listening/review activity and the Asia/Ulaanbaatar calendar.

Signed-in learners can preview and explicitly import this browser's guest cards, assessments and activity. The merge deduplicates existing identities and preserves the guest copy. Guest progress is never silently assigned to an account.

## Subtitle service

Official protocol: <https://ai.opensubtitles.com/api-docs>, specifically its quickstart, multipart translation submission and POST `/ai/translation/{correlation_id}` status endpoint. The client honors the allowlisted login `base_url`, reads supported languages and credits before submission, uploads an SRT file and authenticates the result download. It does not assume AWS or DeepL supports Mongolian. Failed quality checks and external result URLs are rejected.

Jobs use an additive `subtitle_translation_jobs` table in the existing database. An atomic unique reservation by user and content/media fingerprint prevents duplicate paid submissions, including concurrent requests. A lost submission response stays unconfirmed and is never automatically resubmitted. Owner-only polling returns a durable, unguessable caption URL when complete. Only a current administrator can publish a shared movie caption. Results retain their actual timestamps; existing Mongolian assets are never spliced or overwritten.

The subtitle panel polls every four seconds, can resume the stored job after navigation, and does not hold a server request open for minutes. Its session storage contains only a job URL. Provider credentials stay on the server. PaymentIntent creation now uses the payment's captured amount when reusing a checkout request after a plan price change.

Read-only provider verification on 2026-11-23: login, language information and credit lookup returned HTTP 200; two engines reported Mongolian support; available translation credits were zero. No translation, credit purchase or payment was submitted. Existing partial/missing catalog captions therefore remain incomplete until a verified MN track is supplied or translation credits are available. Real paid VIP settlement and full movie playback remain separate live verifications.

Validation covers native media playback, sentence boundaries and loop cancellation, typed recall persistence, explicit guest import, resumable subtitle polling, authenticated provider protocol and concurrent durable job reservation. Fixture-based payment/provider tests are distinct from actual settlement or movie playback.
