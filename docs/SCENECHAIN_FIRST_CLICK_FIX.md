# SceneChain first-click playback fix

This is a focused bug fix after the production-preserving refactor, not the separate placement-assessment feature. Prepared with Codex AI assistance.

The repeated release check `45040597784` reproduced an existing bug: on `/learn`, the video below the viewport could defer loading metadata, while the visible “Сонсоод эхлэх” button remained disabled until that metadata arrived. A user could not start loading by clicking the disabled button. The main quality workflow and live playback worked when metadata had already loaded; the race required its own regression.

The starter now accepts the user's click, scrolls the existing video into view and calls native `play()` immediately. Seeking to the first cue waits for actual metadata when necessary. A pending play disables repeat clicks; errors retain the existing manual-play message. Cached native metadata also synchronizes the existing readiness state. No synthetic video clock is introduced.

The browser regression holds the actual original WebM response, verifies `readyState === 0`, clicks the enabled starter and then releases the response. It requires the real video clock to advance and the existing save/quiz flow to complete. The existing fixture lesson and all styling, routes, account gates, database and payments are retained.

Local Node 22 verification passed: lint, strict typecheck, 26 unit tests, production build and all 12 browser tests including the controlled metadata-delay case. The earlier 20-screenshot refactor report describes release `1ece281`; this focused fix intentionally changes the previously disabled starter state and is verified separately.

## Монгол тайлбар

- **Файл:** `LearningGuide.tsx`, `LearningVideo.tsx`, `useLearningController.ts`, `tests/browser/learn.spec.ts`.
- **Яагаад:** видео харагдахгүй хэсэгт байхад metadata ирэхгүй, товч идэвхгүй үлдэх тойрог хүлээлтийг зассан.
- **Ойлгох код:** `start`, `seekToStart`, `loadedmetadata`, тогтвортой `setReady` callback.
- **Дасгал:** media request-ийг түр хүлээлгээд эхний товч нэг даралтаар ажиллаж буйг browser тестээр тайлбарла.
- **Багшийн 3 асуулт:** preload нь заавал metadata татах баталгаа мөн үү? Seek яагаад metadata хүлээдэг вэ? Mock цаг ашиглаагүйг яаж нотлох вэ?

Deployment was explicitly authorized in the conversation after the refactor PR was prepared. This fix is reviewed separately against the release branch. Rollback reference for the refactor release remains `c120658`; the immediate pre-fix release is `1ece281`.
