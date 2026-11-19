# VXNTA × SceneChain — багшид үзүүлэх тэмдэглэл

Энэ ажлыг AI-ийн тусламжтай хөгжүүлсэн. Зорилго нь архитектур, логик, хязгаар,
шалгалт болон live demo-г ойлгож тайлбарлах юм.

## Баталгаажсан release

- Live watch page: **https://movie-appp-ivory.vercel.app/watch/inception** → Learning Mode.
- Deploy хийсэн application commit: [52c241e](https://github.com/HELFBIIZ/movie-appp/commit/52c241e517db51aec044038bc67e4e5a20e0faff).
- Node 22 CI: [бүх check амжилттай](https://github.com/HELFBIIZ/movie-appp/actions/runs/44582187630).
- Production deployment: `dpl_2mTMTtKUDVM85YxJw5VdqVhUMp8o`, existing `vdzv/movie-appp` project.
- Public production alias дээр **7/7 browser smoke test** давсан: guest gate, native login form,
  local media + safe VTT, corrupt storage, sync/seek/save/quiz/SRS/refresh, normal iframe player,
  390 px mobile layout болон storage quota failure.
- Түр unique deployment URL нь Vercel Authentication хамгаалалттай; багшид дээрх
  public production alias-ийг үзүүлнэ. Deployment Protection/DNS/Clerk settings өөрчлөөгүй.

## Яг хаана ажиллах вэ?

- Ажлын хавтас: `C:\Users\Dell\OneDrive\Desktop\movie-appp`.
- Git remote: `https://github.com/HELFBIIZ/movie-appp.git`.
- Эхэлсэн branch: `vercel-turso`, суурь commit: `625db5b`.
- SceneChain branch: `feat/scenechain-watch`.
- Үндсэн route: `/watch/[slug]`; үзүүлэх жишээ: `/watch/inception`.
- Vercel existing project: `vdzv/movie-appp`, root directory `.`.
- Existing production alias: `https://movie-appp-ivory.vercel.app`; шинэ release дээр public smoke баталгаажсан.

`scenechain-demo/`, өөр repo, өөр Next.js app үүсгээгүй.
Каталог → movie details → watch навигаци хэвээр. Normal горим үндсэн таван
iframe player болон өмнөх серверийн VIP шалгалтыг ашиглана.

## Аудит ба хамгаалсан зүйлс

Одоогийн төсөл Next.js 16, React 19, Tailwind 4, shadcn маягийн existing UI,
Clerk identity bridge, custom session, libSQL/Turso, Wire.mn/QPay ашиглаж байна.
Supabase/Drizzle одоогийн runtime биш тул сургалтын өгөгдөлд schema migration
эсвэл production database write нэмээгүй.

Эхлэхэд package.json-ийн test script, subtitle service, checkout, pricing,
generated-store болон untracked subtitle regression test өөрчлөгдсөн байсан.
Эдгээр өмнөх өөрчлөлтүүдийг workspace-д хадгалж, SceneChain commit-д оруулаагүй.
DB/WAL/SHM, smoke.log, .env файлуудыг commit/deploy source-д нэмээгүй.
Payment API, production DB, DNS, Clerk settings болон secret утгуудыг өөрчлөөгүй.

## 110 секундийн үзүүлбэр

1. **0–15 сек:** `/watch/inception` дээр Normal-ыг харуул. Guest бол VIP/sign-in
   хаалт хэвээр. Sample нь төлбөртэй киноны эрх нээдэггүйг тайлбарла.
2. **15–30 сек:** Learning Mode → Sample lesson. “The Last Train” нь киноны
   яриа биш, original animated lesson бөгөөд narration нь synthetic гэдгийг хэл.
3. **30–50 сек:** Play. EN/MN идэвхтэй cue солигдохыг үзүүл. Transcript-ийн
   `00:07` дээр дарж video seek хий. `ticket` дээр дарж утга, контекст,
   жишээ, дүрэм харуулаад Save Word, Save Sentence дар.
4. **50–70 сек:** Word Quiz-д зөв хариулж бодит оноог үзүүл. Scene Quiz нь
   “Яагаад яарч байсан бэ?” гэсэн үйл явдлыг ойлгох асуулт гэдгийг тайлбарла.
5. **70–90 сек:** Saved & Review нээ. Хадгалсан өгүүлбэрийн утгыг хараад
   Саналаа эсвэл Мартсан сонго. Дараагийн due date, зөв/буруу тоог харуул.
6. **90–110 сек:** Refresh → Learning Mode → Saved. Browser-local хадгалалт
   үлдсэнийг үзүүл. Movie player сонгоход “Sync unavailable for this player”
   гарна. Normal руу буцаж үндсэн player/gate хэвээр байгааг харуул.

## Ажилладаг зүйлс

- Үндсэн watch хуудсан дахь Normal/Learning toggle, desktop/mobile dock.
- Original 38 секундийн local asset video, бодит HTML video play/pause/time/seek.
- Бодит narration buffer-ийн хугацаанаас үүсгэсэн EN/MN WebVTT хадмал.
- BOM/CRLF, хоёр timestamp хэлбэр, cue id/settings, overlapping cues,
  буруу timestamp, HTML/script хамгаалалттай parser; plain-text React render.
- Positive timestamp overlap-аар хос хадмал тааруулах; cue end exclusive.
- 16 curated үгийн утга, context, example, grammar. Үг сонгоход video pause хийнэ.
- Давхардахгүй үг/өгүүлбэр; movie/media id, cue time, review state хадгална.
- Browser-local хадгалалт, schema validation, quota/corrupt storage error,
  өөр tab-ийн storage event; 500 картын хязгаар.
- Saved word-д тулгуурласан ялгаатай сонголттой quiz, бодит зөв/буруу оноо.
- Sample-ийн үйл явдалд тулгуурласан context question, оролдлогын тоо хадгална.
- SRS: зөв бол 1/3/7/14 хоног, шат 4 дээр 14 хоногоор үргэлжилнэ;
  буруу бол шат 0, 10 минут. Шинэ карт шууд due. Тоолуур 30 секунд тутам,
  tab дахин идэвхжихэд болон хариулт бүрт шинэчлэгдэнэ.
- Local video + өөрийн таарах EN/MN VTT; timestamp seek, sentence saving/review.
  Файлууд сервер рүү upload хийгдэхгүй; object URL cleanup хийнэ.

## Хязгаарлагдмал болон дараагийн milestone

- **Iframe sync:** одоогийн таван provider-ийн яг ашиглаж буй URL/version-д
  баталгаажсан SDK/command-event contract холбогдоогүй. Registry-д бүгдийн
  `getCurrentTime/play/pause/seek` false. Энэ нь provider бүрийн бүх хувилбарт
  API байхгүй гэсэн дүгнэлт биш. Untrusted postMessage огт хүлээн авахгүй.

  | Provider / iframe origin | getCurrentTime / play / pause / seek | Нотолгоо, шийдвэр |
  | --- | --- | --- |
  | VidSrc / `vidsrcme.ru` | false / false / false / false | Existing watch iframe; SDK import эсвэл баталгаажсан message contract холбогдоогүй. |
  | CineSrc / `cinesrc.st` | false / false / false / false | Existing watch iframe; ижил conservative шийдвэр. |
  | SuperEmbed / `multiembed.mov` | false / false / false / false | Existing watch iframe; redirect origin-ийг тааж command явуулахгүй. |
  | EmbedMaster / `embedmaster.link` | false / false / false / false | Subtitle URL parameter нь clock/seek API-ийн баталгаа биш. |
  | Embed API / `watch.embed-api.stream` | false / false / false / false | Нэрэндээ API гэсэн ч verified time/control contract суулгаагүй. |
  | Native HTML video / same-origin asset эсвэл local blob | true / true / true / true | HTMLMediaElement-ийн бодит property/event/method; unit болон browser smoke тест. |
- **Киноны бүрэн хадмал:** sample нь тухайн киноны EN/MN dialogue биш.
  Cross-origin DOM, stream extraction, DRM bypass, scraping/proxy нэмээгүй.
- **AI:** curated тайлбарууд AI service биш. Live AI translation, explanation,
  RAG, speech recognition болон semantic search хийгдээгүй.
- **Cloud:** localStorage нь device/account хооронд sync хийхгүй. Энэ browser-ийн
  энэ origin-ийг хуваалцдаг хүмүүс ижил карт харна; хувийн sensitive мэдээлэл
  хадгалах зориулалтгүй. Өөр browser/domain нь тусдаа storage ашиглана.
- **Local file:** refresh хийсний дараа video/VTT-г дахин сонгоно. Local файлд
  sample-ийн curated vocabulary/context quiz-ийг худал тааруулж харуулахгүй.
- **Playback:** sample/local руу шилжихэд iframe unmount хийгдэж тоглолт зогсоно;
  Normal руу буцахад iframe дахин ачаална. Үүнийг seamless movie resume гэж
  сурталчлахгүй. Кино бүрт бодит sync нь дараагийн интеграцийн ажил.
- **SRS:** энэ нь энгийн интервалын загвар; SM-2/FSRS эсвэл шинжлэх ухаанаар
  баталсан хувийн adaptive scheduler гэж нэрлэхгүй. Quiz дахин хийх нь дахин
  дасгалын оролдлого гэж тоологдоно.

## Урсгал

`video.currentTime → activeCues → сонгосон үг + cue → localStorage → quiz answer → reviewItem → dueAt`

Video-ийн бодит цагийг timeupdate/seeked event уншина. Тэр цагт багтсан cue-үүдийг
олно. Үг сонгоход curated тайлбар болон эх өгүүлбэрийг холбоно. Save хийхэд
давхардлыг шалгаж storage-д бичнэ. Quiz зөв/бурууг answer-тай харьцуулна.
SRS зөв/буруу тоо, шат, дараагийн давтлагын timestamp-ийг шинэчлээд хадгална.

## Файлуудын үүрэг

| Файл | Юу хийдэг вэ? |
| --- | --- |
| `src/app/watch/[slug]/page.js` | Existing watch page-д toggle болон lazy-loaded dock холбосон. Movie gate болон provider URL-уудыг хадгалсан. |
| `src/components/Footer.js` | Existing social/help/admin холбоосууд жижиг дэлгэцэд 7 px overflow үүсгэж байсныг wrap хийсэн. URL болон footer агуулга өөрчлөгдөөгүй. |
| `src/components/ClerkOAuth.js` | Clerk key байхгүй CI build-д provider-гүй hook дуудаж /login prerender унаж байсныг гадна component guard-аар зассан. Нэвтрэлтийн хүсэлт, Clerk settings, session bridge өөрчлөгдөөгүй. |
| `src/proxy.ts` | Clerk key байхгүй үед login request/prefetch-ийг унагаахгүйгээр native password flow-д хүргэнэ. Clerk key-тэй үед existing middleware хэвээр; OAuth bridge өөрийн auth шалгалтаа хадгална. |
| `LearningModeToggle.tsx` | Keyboard-оор ашиглах боломжтой Normal/Learning сонголт. |
| `LearningDock.tsx` | Source сонголт, video, тайлбар, сургалтын panel-уудын responsive байрлал. |
| `LearningPanels.tsx` | Transcript, Saved & Review, Word Quiz, Scene Quiz panel солих. |
| `LearningProgress.tsx` | Хадгалсан/due/mastered карт болон context оролдлогын бодит тоо. |
| `LearningVideo.tsx` | Native video event-үүд, seek-ийн бэлэн байдал, одоогийн хос cue, video error. |
| `LocalMediaInput.tsx` | Video/VTT file size/type шалгаад browser-д уншина. Subtitle болон file metadata-аас media fingerprint үүсгэнэ. |
| `SubtitleTranscript.tsx` | Хугацаатай EN/MN cue, идэвхтэй мөр, үг сонгох, sentence хадгалах. |
| `WordPanel.tsx` | Сонгосон үгийн утга, тухайн өгүүлбэрийн контекст, жишээ, дүрэм, Save Word. |
| `VocabularyPanel.tsx` | Картууд, due date, зөв/буруу, reveal/review болон устгах үйлдэл. |
| `QuizPanel.tsx` | Сонголт, зөв/буруу feedback, оноо; storage амжилттай үед хариултыг хүлээн авна. |
| `useLearningController.ts` | Video цаг, cue, сонголт, хадгалалт, quiz/SRS-ийн UI orchestration. Ready төлөвийг media key-тэй холбож cached metadata event-ийн дараа reset хийхгүй; шинэ картын due тоог шууд шинэчилнэ. |
| `useLearningStorage.ts` | Storage унших/бичих, cross-tab шинэчлэлт, амжилтгүй хадгалалтын UI. |
| `useLesson.ts` | Зөвхөн хоёр тогтмол same-origin VTT татна; local object URL-ийн lifecycle. |
| `src/lib/learning/types.ts` | Cue, үг, хадгалсан карт, progress, question-ийн TypeScript бүтэц. |
| `vtt.ts` | Safe parse, timestamp validation, overlap alignment, active cues, time formatting. |
| `storage.ts` | Zod schema, versioned storage key, давхардалгүй id, 500 картын хязгаар. |
| `srs.ts` | Интервал, due шалгалт, зөв/буруу тоо болон reset. |
| `quiz.ts` | Хадгалсан үгсээс ялгаатай сонголт үүсгэх, хариулт бодитоор шалгах. |
| `sample.ts` | Original зохиол, 16 curated үг, sample context question. |
| `player-adapter/index.ts` | Native video adapter болон conservative iframe capability registry. |
| `public/learning/last-train.webm` | Репод хадгалсан original lesson видео; гаднын stream хамааралгүй. |
| `last-train.en.vtt`, `last-train.mn.vtt`, `timings.json` | Actual narration-тай таарсан EN/MN cue болон түүний timing manifest. |
| `public/learning/README.md` | Asset provenance, лиценз, sample-ийн хязгаар болон дахин үүсгэх заавар. |
| `scripts/create-learning-sample.mjs` | Windows SAPI + canvas + MediaRecorder-оор original sample үүсгэж, seek metadata-тай remux хийнэ. |
| `tests/learning.test.mjs` | Parser, alignment, SRS, storage, quiz, adapter, asset timing unit tests. |
| `tests/browser/learning.spec.ts` | Normal gate/player, video sync, seek, save, quiz, review, refresh, mobile, storage failure smoke tests. |
| `playwright.config.ts` | Нэг browser worker, local production server эсвэл өгсөн base URL дээр smoke тест. |
| `tsconfig.json` | Шинэ learning module-ийн strict TypeScript шалгалт; existing JavaScript-ийг хүчээр migrate хийхгүй. |
| `eslint.config.mjs`, `.prettierrc.json` | Learning source-ийн lint болон formatting дүрэм. |
| `.github/workflows/scenechain.yml`, `.nvmrc` | Node 22 CI: install, lint, type, format, unit, build, browser checks. |
| `package.json`, `package-lock.json` | TypeScript, Zod, ESLint/Prettier, Playwright болон шалгах script-үүд. Windows-ийн Turbopack memory алдааг тойрч Webpack build хэрэглэнэ. |
| `.gitignore` | Local browser test output/screenshot-ийг commit-оос хасна. |

Component нэртэй файлууд `src/components/learning/` дотор, lib нэртэй файлууд
`src/lib/learning/` дотор байна.

## Багшийн 10 асуулт, товч хариулт

1. **useState юу хадгалдаг вэ?** Mode, source, video time, сонгосон үг,
   quiz-ийн хариулт зэрэг render-д нөлөөлөх UI төлөв.
2. **useEffect яагаад хэрэгтэй вэ?** VTT fetch, storage event, timer, object URL
   зэрэг React-аас гаднах үйлдлийг холбож, cleanup хийхэд.
3. **map юу хийдэг вэ?** Cue бүрийг transcript мөр, word бүрийг сонголт,
   card бүрийг review UI болгож хувиргана; key нь identity-г хадгална.
4. **find ба filter ялгаа?** find нь эхний тохирох үгийн тайлбарыг олно;
   filter нь зэрэг идэвхтэй байж болох бүх overlapping cue-г буцаана.
5. **localStorage database мөн үү?** Browser origin-д хамаарах string storage.
   JSON serialize/parse хийдэг, cloud/account sync биш, хаагдсан/дүүрсэн байж болно.
6. **TypeScript type юу хамгаалдаг вэ?** Cue-ийн start/end нь number,
   question-ийн choices нь string[] байхыг compile үед шалгана. Runtime JSON-д
   type дангаараа хүрэлцэхгүй тул Zod validation хийдэг.
7. **VTT гэж юу вэ?** WEBVTT header болон эхлэх/дуусах цагтай plain-text
   subtitle формат. Бид зөвхөн positive overlap-тай EN/MN cue-үүдийг холбодог.
8. **Iframe яагаад sync болохгүй вэ?** Өөр origin-ийн video DOM-д same-origin
   policy-оор нэвтрэхгүй. Баталгаажсан provider SDK/postMessage contract хэрэгтэй.
9. **API хаана байна вэ?** Existing `/api/watch/[slug]` нь серверийн access gate.
   Learning sample-ийн VTT нь fixed same-origin static asset; шинэ AI API, client
   secret эсвэл arbitrary remote fetch нэмээгүй.
10. **SRS хэрхэн тооцдог вэ?** Санавал stage өсч 1/3/7/14 хоногийн dueAt;
    мартвал stage 0, 10 минут. Date.now()-тай dueAt-ийг харьцуулж due-г тоолдог.

## Pinebaatars шаардлагын байдал

[Stack/map](https://pinebaatars-stack.pineconegpt1.workers.dev/#map),
[standards](https://pinebaatars-stack.pineconegpt1.workers.dev/standards),
[projects](https://pinebaatars-stack.pineconegpt1.workers.dev/projects)-ийг уншсан.

| Шаардлага | Энэ MVP |
| --- | --- |
| Next.js + React + Tailwind, existing UI хадгалах | Биелсэн; шинэ learning module TypeScript. |
| TypeScript, component boundary, нэршил, input validation | Learning code strict types, Zod storage, safe VTT, жижиг UI modules. Existing app бүхэлдээ TS болоогүй. |
| ESLint + Prettier | Learning module дээр хэрэгжсэн. Legacy payment/auth бүх source-ийн lint migration дараагийн milestone. |
| Node 22 | `.nvmrc` болон CI 22; шинэ 10 unit test-ийг Node 22 дээр ажиллуулж давсан. Existing Windows/Vercel 24.x тохиргоог өөрчлөөгүй. |
| GitHub Actions | Learning CI нэмсэн. Branch protection/review settings өөрчлөөгүй. |
| Pre-commit hook, нийт app-ийн стандарт | Дараагийн milestone; existing Git hook-ийг өөрчлөөгүй. |
| Secrets | Шинэ secret шаардлагагүй; `.env` болон client bundle-д API key нэмээгүй. |
| Clerk + payment | Existing implementation хадгалсан; шинэ төлбөр бодитоор туршаагүй. |
| Supabase/Drizzle | Хийгдээгүй; existing Turso-г migrate хийгээгүй. Learning storage browser-local. |
| HF/Pinecone/Claude RAG, n8n, Facebook | Дараагийн milestone; энэ MVP-д хийсэн гэж танилцуулахгүй. |
| Explainable working demo | Original sample, deterministic curated content, бодит quiz/SRS, tests. |

## Шалгах команд ба deployment

Локал баталгаажуулалт: lint, strict TypeScript, Prettier, Webpack production build
амжилттай. Шинэ unit test 10/10 (Node 22 болон 24), өмнөх subtitle regression-тэй
нийлээд 25/25; эцсийн Node 22 CI болон public production browser smoke тус бүр 7/7 давсан. 390 px mobile overflow болон cached
metadata-аас үүсэх seek readiness алдааг browser тестээр олж зассан.

```text
npm run lint
npm run typecheck
npm run format:check
npm run test:learning
npm run build
npm run test:browser
```

Өмнө байсан uncommitted subtitle regression tests-ийг локал дээр `npm test`-ээр
хамт ажиллуулна. Тэдгээрийг SceneChain commit-д өөрийн ажил мэт нэмээгүй.

Browser tests нь watch access response-ийг mock хийдэг: production user, session,
subscription эсвэл XP өгөгдөл үүсгэхгүй. Allowed player тест iframe-ийн network-ийг
block хийж UI-г шалгана; third-party stream үнэхээр ажилласны баталгаа биш.

Тестийн browser local cache-д өөр хувилбартай байвал `SCENECHAIN_CHROMIUM_PATH`
environment variable-аар installed Chrome executable өгч болно. CI өөрийн тохирох
Chromium-ийг суулгана. Live URL-ийг `SCENECHAIN_BASE_URL`-аар өгч smoke тест хийнэ.

Deploy source нь зөвхөн commit хийсэн feature branch-ийн цэвэр checkout байх ёстой.
Workspace-ийн uncommitted payment/subtitle өөрчлөлтүүдийг санамсаргүй deploy хийхгүй.
Vercel UI fallback: **team vdzv → movie-appp → Deployments → Create Deployment →
branch feat/scenechain-watch → Deploy**. Build `npm run build`, root `.`.
Existing environment/domain/payment settings өөрчлөх шаардлагагүй.

Public watch URL дээр шинэ Learning Mode, sample asset, EN/MN cue болон хадгалалтын
урсгал smoke тестээр батлагдсаны дараа л deploy амжилттай гэж тэмдэглэнэ.
