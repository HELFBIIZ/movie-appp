# Learning subtitle correction — 2026-11-26

The reported learning card paired “that's gonna sound crazy.” with the meaning of a different sentence. The checked-in Mongolian VTT contains the two meanings in separate cues. The learning engine loads EN and MN independently; CineSrc's internal CC display is a separate subtitle system.

## Source review

This fix starts at OpenCode's `b7819e4455b240b6f06a571103e423f848f22cce`, including its VIP, comments, referrals, player and legacy XP changes. Those changes are retained. The active IDE folder contains a different implementation, so this work uses a separate Git worktree and feature branch.

The ordinal alignment heuristic introduced in `b7819e4` accepted a cue-count difference of up to 5%. Missing translated cues and different sentence segmentation invalidate ordinal pairing. The translation route also drops untranslated lines, making such assumptions particularly unsafe. A positive timestamp overlap alone can also pick the next sentence when two releases have different timing.

The existing CI failure at that commit happened while generating the old visual baseline: current tests expected six players against a baseline with five. Lint, types, unit tests, build and the ordinary browser suite had passed. This was not evidence that the subtitle pairing was correct.

## Changes

- Match MN intervals to the EN sentence boundaries and coverage. Reject partial or merged sentence meanings. Suppress coincidental matches across incompatible tracks. Never infer a pair from ordinal position or silently change the user's offsets.
- Retain explicit EN/MN offsets and supported player clock validation. Independent subtitle timing cannot prove semantic correctness or movie identity.
- Provide short authored meanings for eight exact conversational expressions, including the reported phrase. These run locally, work across movie routes and take no provider quota. They are explanations of the selected English text, not invented film dialogue.
- Let the learner reject an incorrect subtitle meaning, then explicitly request the selected English sentence's meaning. Show the MyMemory notice before requesting it; retain the shared free budget, authentication and quota limits. No paid fallback or whole-film translation is introduced.
- Share corrected meanings with word teaching, the transcript and sentence saving. Keep at most 200 corrections/rejections in browser storage, scoped to the media fingerprint. Preserve existing learning progress. Report storage failures.
- Refresh cached automatic tracks when the site returns new captions. Preserve manual selections and ambiguous legacy settings. An explicit “Сайтын хадмалыг дахин авах” action backs up the previous settings before replacing tracks.
- Distinguish the player panel's automatic default MN selection from a learner's explicit choice. The default previously raced the learning API and overwrote saved manual tracks, even labeling the replacement as manual. Automatic selections now use the canonical learning response; explicit subtitle choices still propagate to learning. Automatic application no longer awards subtitle-help XP. Fix the instant-subtitle button passing its click event as a URL.
- Audit all 690 checked-in VTTs: all parse, 450 are marked partial, and only 249 meet the existing 60% Cyrillic-cue threshold. Keep the available MN cues of partial files for learning instead of discarding the entire file. The native subtitle endpoint and learning responses now remove untranslated EN lines, retain timestamps, mark partial results and emit strict VTT with blank cue separators. The existing stricter validator remains for newly submitted complete translation jobs/uploads. This does not create missing translations or certify their semantic accuracy.
- Explain common spoken expressions (`gonna`, `wanna`, `gotta`, `sound crazy`, `sound good`, `believe me`) with authored Mongolian meanings, short usage notes and original examples across all movie transcripts. Word selection retains its sentence position, so an unrelated noun elsewhere in the line does not acquire a phrase's meaning. Invalid cached MN data falls back to a usable local track.
- Replace the unverified claim that selecting Binge guarantees the correct Mongolian translation. Our application cannot edit a third-party iframe's internal CC translation.

## Validation and limits

Regression tests cover missing/extra cues, incidental overlap, split/merged sentences, incompatible releases, sparse partial translations, explicit offsets, source-aware cache refresh, manual/legacy retention and natural exact phrase meanings. Browser tests cover the reported bad pair, explicit correction, word teaching, switching to the transcript, browser caching/reload and both Spider-Man and Inception routes. Browser protocol fixtures do not certify full movie playback.

No payment is created, no production learning progress is modified, and no paid translation is called by verification. Authentic full-film EN/MN correspondence and third-party embedded CC quality still require matching authorized source tracks; machine translation is not a guarantee of meaning.
