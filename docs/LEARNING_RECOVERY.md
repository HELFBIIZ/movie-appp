# Learning and payment recovery

Placement retests alternate between two original eight-question forms. Both cover the same vocabulary, grammar, reading and difficulty counts. They remain informal starting recommendations, not calibrated proficiency exams. The first attempt keeps the existing questions and layout; history grades each attempt against its own form.

Form A remains in the existing `assessments` array. Form B uses the optional `retests` extension, so older browser clients can still decode every entry in `assessments`. Server writes keep the existing revision compare-and-swap check and merge only validated fields present in the request using SQLite JSON merge-patch. An older client omitting `retests` cannot erase that extension; an explicit empty array can clear it. Device and guest merges deduplicate both histories.

`GET /api/payments/wire/pending` reads up to three owned Wire requests created in the last 24 hours, including recently completed ones whose hosted return may have been lost. Both the checkout row and payment must belong to the session user. The endpoint creates no invoice, PaymentIntent, checkout or subscription. It exposes no provider reference or bank account. Results are private and uncached; the browser verifies the response owner and validates checkout destinations with the existing Wire URL policy.

The pricing page offers the existing hosted URL or an explicit status check. Selecting a request restores its original safe movie/learning destination and records the transaction in the URL, so refreshing continues verification. VIP is still shown only after the existing owned status endpoint confirms payment and an active subscription. Changing transactions resets the previous status view.

Validation includes form-specific grading, legacy-client compatibility, revision races, history deduplication, owned/recent payment queries, URL validation, alternating retests and lost-return recovery without creating a payment. Real settlement and full film playback require their own live verification. The original working checkout is preserved; implementation continues from the deployed `vercel-turso` source in the isolated worktree.

Read-only OpenSubtitles checks on 2026-11-24 still report zero translation credits. No paid translation or money transfer is part of this release.
