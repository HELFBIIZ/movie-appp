# Spider-Man: Brand New Day — SceneChain integration ба баталгаажуулалтын хязгаар

**Энэ нь жинхэнэ кино бүрэн баталгаажсан гэсэн тайлан биш.** Хэрэглэгчийн
“одоогийн баталгаагүй зүйл дээр нэм” гэсэн нэмэлт зааврын дагуу existing player,
repo-д байсан MN VTT дээр movie-specific холболт нэмсэн. Эрх, киноны агуулга,
орчуулгын зөв байдал болон бодит киноны timeline-ийг баталгаажуулсан гэж нэрлэхгүй.

## Render дээрх дараагийн хэрэглээ

Одоогийн сайт: https://vxnta-movie-app.onrender.com/movie/spider-man-brand-new-day.
Анхны зочинд эхлэх түвшний 8 асуулт санал болгоно. Дуусгаад **Энэ киногоор
сурах** дарвал энэ киноны watch learning mode нээгдэнэ. Түвшний баримжаанд
нийцсэн үгийн зорилго, монгол тайлбарын харагдацыг тохируулна.

Нэвтрэх эрх баталгаажсан үед энэ киноны learning mode **CineSrc-ийг анхлан
сонгоно**; бусад тоглуулагчийн сонголтыг хадгалсан. Clock/seek боломжийг
зөвхөн тухайн iframe-ийн бодит, шалгасан event-ээс тогтооно. English VTT
импорт, өөрийн утгын тэмдэглэл, хадгалалт, quiz/SRS нь өмнөх movie-scoped
өгөгдлөө ашиглана. Sample киногоор солихгүй.

Нэвтэрсэн хэрэглэгчийн full-film playback, EN/MN хувилбарын таарц болон эх
сурвалжийн эрхийг энэ UI өөрчлөлт батлахгүй. Production нэвтрэлт 401 буцаасан
тул хэрэглэгчийн бэлдэх Render/DB холболтоор үргэлжлүүлэн шалгах шаардлагатай.
Доорх deploy дүн нь өмнөх Vercel release-ийн түүхэн тайлан.

## Deploy болон шалгалтын бодит дүн

- Live: **https://movie-appp-ivory.vercel.app/watch/spider-man-brand-new-day**.
- Application commit: [e88da23](https://github.com/HELFBIIZ/movie-appp/commit/e88da23261f0910551d45790801a59d159acef4e).
- [Node 22 CI — бүх шат амжилттай](https://github.com/HELFBIIZ/movie-appp/actions/runs/44650912377):
  lint, TypeScript, format, 17 unit test, production build, 9 browser test.
- Local unit + өмнөх subtitle regression: **32/32**.
- Vercel existing project `vdzv/movie-appp`, deployment `dpl_6ZNgeotkF1ScbiJ4NF7C6vnBe31q`.
- Public production дээр **mock-гүй Spider-Man guest test 1/1** болон live audit давсан.
  Title зөв; access **401 UNAUTHENTICATED**; movie iframe/video 0; sampleOffered false;
  guest notice true; 390 px viewport/scrollWidth хоёулаа 390.
- `moviePlaybackVerified: false`, `filmIdentityVerified: false`,
  `subtitlesVerifiedAgainstFilm: false`. Энэ deploy нь integration wiring;
  authorized real-film playthrough баталгаажсан release гэж нэрлэхгүй.
- API origin/window/schema, seek acknowledgment, English panel/file import,
  word notes, quiz, persistence нь unit + тусдаа тодорхой тэмдэглэсэн protocol fixture-ээр
  шалгагдсан. Fixture-ийг actual film/video/таймстампын нотолгоо гэж тооцоогүй.

## Аудит

- Repository: `HELFBIIZ/movie-appp`; эхэлсэн commit `e52c4a2`.
- Branch: `feat/scenechain-spider-man`.
- Route: `/watch/spider-man-brand-new-day`; TMDB `969681`.
- Existing production: `https://movie-appp-ivory.vercel.app`.
- Existing uncommitted payment/subtitle өөрчлөлтүүд, DB/WAL/SHM, log файлуудыг хадгалсан.

Таван player нь cross-origin iframe. Өмнөх `useLesson('movie')` нь URL/cue
буцаадаггүй байсан; SubtitlePanel-ийн сонголт Learning Dock-той холбогдоогүй.
Үгийн тайлбар, context question нь зөвхөн The Last Train-д зориулсан байсан.
`streaming.json` дахь target movie-ийн жагсаалт хоосон. Repo-д full movie/local
film asset, license record эсвэл кинотой таарах EN transcript олдоогүй.

Legacy `streams.mjs` нь гуравдагч талын proxy/source resolver ашигладаг.
Үүнийг licensed movie source гэж батлаагүй; шинэ learning code энэ resolver-ийг
дуудахгүй, stream URL гаргаж авахгүй, iframe DOM/DRM/эрхийн хаалт тойрохгүй.

## Existing хадмалын бодит мэдээлэл

`data/subtitles/spider-man-brand-new-day.vtt`:

- 170,810 bytes, 1,753 cue.
- Existing generator cue-үүдийн хооронд хоосон мөр орхисон: strict VTT parser raw
  файлыг нэг урт cue гэж уншиж байсан. Movie loader separator-ийг зөвхөн memory-д
  хэвийн болгож 1,753 тусдаа cue уншина; эх файл, үг, timestamp өөрчлөөгүй.
- Эхний timestamp `00:01:12.188`; сүүлчийн cue end `02:24:26.700`.
- SHA-256: `8fa6debfec4bd098e160a25ea21e1c7fb155b2d10d12828f52b608be33ccce13`.
- Manifest: source `opensubtitles`, language `mn`, `generated: true`,
  `translated: true`, sourceDetail `OpenSubtitles (native Mongolian)`.
- Original subtitle/file ID, release/cut, English pair, license, verified offset
  болон scene boundaries байхгүй. Эдгээр manifest flag нь provenance/accuracy proof биш.

VTT parse/overlap/offset-ийн **техникийн** ажиллагааг шалгаж болно. Эдгээр timestamp
жинхэнэ кинотой зөв таарч байгааг original video/English release-гүйгээр батлахгүй.
Ижил filename эсвэл TMDB ID нь агуулгын баталгаа биш. UI-д MN-ийг **баталгаажаагүй**
гэж тэмдэглэнэ. Default offset 0 нь measured offset биш.

Existing OpenSubtitles credentials-ийг утгыг нь задруулахгүйгээр шалгасан.
Албан ёсны API дээр TMDB 969681, English metadata search **200**, гурван release
result ирсэн. Transcript татаж аваагүй; filename/file ID, account access нь
лиценз, exact cut, агуулгын зөв байдал эсвэл MN alignment-ийг батлахгүй.
Existing SubtitlePanel-аас хэрэглэгч English load хийхэд зөвхөн same-origin
`/api/subtitles/source/{uuid}` URL-ийг learning loader хүлээн авна. Arbitrary
remote URL fetch хийхгүй; source байхгүй/expired бол error харуулж local EN import санал болгоно.

[Sony-ийн албан ёсны movie page](https://www.sonypictures.com/movies/spidermanbrandnewday)
нь гэрээр үзэх retail сувгуудыг заадаг. Кино гараагүй гэсэн шалтгаан хэлээгүй;
энэ repo-д ашиглах эрхтэй integration source байгаа эсэх нь тусдаа асуудал.
Retail listing-ийг VXNTA-д embed хийх зөвшөөрөл гэж нэрлээгүй.

## Нэмсэн ажиллагаа

1. Энэ route-д Learning Mode нь **Movie player**-аар эхэлнэ. Sample сонголт
   санал болгохгүй; sample asset-ийг movie mode-д fetch/play хийхгүй.
2. Normal Mode, таван provider сонголт, серверийн login/VIP gate хэвээр.
   CineSrc-г зөвхөн gate зөвшөөрсний дараа Player 2 товчоор сонгоно.
3. [CineSrc-ийн албан ёсны API docs](https://cinesrc.st/docs)-ийн message envelope
   дээр adapter нэмсэн. Docs-оос runtime capability-г шууд true болгохгүй.
4. Origin, frame window source, frame src-ийн movie ID, message schema,
   optional payload movie IDs, finite/range-valid timestamp шалгана.
   Movie/frame/provider солигдоход хуучин session/event-ийг цуцална.
5. `timeupdate` эсвэл validated getter reply иртэл clock null. Parent талд video
   timer дуурайлган гүйлгэхгүй. Зөв time/duration event л cue selection-ийг өөрчилнө.
6. Seek нь provider-д documented хүсэлт илгээнэ. Parent clock-ийг optimistic
   байдлаар өөрчлөхгүй. Тохирох `seeked` acknowledgment иртэл seek unverified;
   таван секундэд батлагдахгүй бол UI тайлбарлана.
7. API payload signed film/content ID өгдөггүй. Requested iframe URL-д холбосон
   identity check нь **served film зөв** гэсэн cryptographic/visual proof биш.
   `contentVerified` false хэвээр.
8. Зөвшөөрөгдсөн watch session-д existing same-origin MN VTT-г уншина. EN байхгүй
   үед MN-only transcript; English dialogue зохиохгүй, буцааж орчуулаад original гэж нэрлэхгүй.
9. Таарах өөрийн English VTT-г browser-local импортлож болно. EN/MN offset
   тусдаа ±600 секунд; positive overlap alignment. EN/offset нь тусдаа local key-д
   хадгалагдана; quota/corrupt data-г чимээгүй overwrite хийхгүй.
10. Импортолсон EN үг дээр дарж **өөрийн** context meaning, grammar note оруулна.
    Утгагүй хоосон карт хадгалахгүй. Энэ нь automated/verified AI explanation биш.
11. Save Word/Sentence нь route movieId, TMDB ID, transcript fingerprint,
    offset-той cue time, provenance хадгална. Хуучин storage v1 key/data-г хадгалсан.
12. Saved word-ийн quiz, SRS, progress хэвээр; шинэ үг user-note гэдгийг харуулна.
    Scene Quiz-д бодит context-ийг нягтлаагүй тул шинэ асуулт зохиогоогүй.
13. 1,753 cue-г нэг дор DOM-д оруулахгүй: 50 cue-ийн pagination, active cue-г дагана.
14. Existing local video + EN/MN VTT хувилбар хэвээр; EN үгийн өөрийн тэмдэглэл,
    quiz/SRS ашиглаж болно. Энэ хувилбарыг CineSrc ажилласны баталгаа гэж нэрлэхгүй.

## Provider-ийн төлөв

| Provider | Энэ өөрчлөлтийн бодит төлөв |
| --- | --- |
| CineSrc / `cinesrc.st` | Documented API adapter холбогдсон; бодит frame event ирсэн method л transport capability авна. Энэ киноны authenticated playback батлагдаагүй. |
| VidSrc / `vidsrcme.ru` | Normal сонголтыг хадгалсан; clock/seek contract холбогдоогүй. Root page domain-for-sale гэж ирсэн нь embed endpoint-ийн бүх нөхцөлийг шалгасан гэсэн үг биш. |
| SuperEmbed / `multiembed.mov` | Existing iframe; verified clock/seek байхгүй. |
| EmbedMaster / `embedmaster.link` | Existing iframe; subtitle URL parameter нь time/control API proof биш. |
| Embed API / `watch.embed-api.stream` | Existing iframe; энэ өөрчлөлтөд clock/seek contract холбогдоогүй. |

## Тестийг зөв ойлгох нь

`scripts/audit-spider-man.mjs` нь **mock-гүй** public route audit. Эхний
ажиллуулахад guest POST `/api/watch/spider-man-brand-new-day` → **401 UNAUTHENTICATED**,
movie iframe/video 0, movie source sync unavailable байсан. Sample тоглуулаагүй.
Public MN metadata 200, 1,753 cue гэсэн manifest буцсан. 390 px viewport overflow-гүй.
Энэ нь actual film playthrough биш; signed-in VIP test session өгөөгүй.

`tests/browser/spider-man.spec.ts` дотор хоёр өөр шалгалт бий:

- **Real guest route:** access response mock хийхгүй; зөв title, gate, sample
  substitution байхгүй, unknown clock, mobile/local option-ийг шалгана.
- **Protocol fixture:** access response болон CineSrc HTML-ийг зориуд тестийн
  fixture болгоно. Signed window messaging, seek acknowledgment, EN import,
  manual notes, quiz, refresh persistence-ийн UI wiring-ийг шалгана. Энэ нь
  жинхэнэ кино, licensed source, authentic dialogue эсвэл real-film clock-ийн proof биш.

Unit tests нь wrong origin/window/movie ID, malformed schema/time, source change,
disposed session, unconfirmed seek, paused getter reply, offset, EN байхгүй үе,
хэшийг шалгана. Өмнөх тестүүдийг устгаагүй. Эцсийн run/CI/deploy-ийн үр дүнг
final report-д тухайн бодит дүнгээр нь бичнэ.

## Өөрчилсөн файлууд

| Файл | Тайлбар |
| --- | --- |
| `src/app/watch/[slug]/page.js` | Target-ийн default movie mode; бодит iframe ref/provider/VIP state-ийг dock руу өгнө. Frame key-д TMDB ID нэмсэн. |
| `src/lib/learning/movie.ts` | Target identity, fixed MN URL, offset/alignment, transcript fingerprint. |
| `src/lib/learning/player-adapter/cinesrc.ts` | Strict frame/message binding, real event/getter clock, acknowledged seek, cleanup. |
| `player-adapter/index.ts` | Static false defaults болон CineSrc runtime verification requirement-ийг ялгана. |
| `useMoviePlayer.ts` | React lifecycle-д adapter холбож, хуучин connection state-ийг шинэ provider-д зөөхгүй. |
| `useMovieLesson.ts` | VIP зөвшөөрсний дараа MN уншина; EN upload, local settings, offsets, hash. |
| `MovieLearningStatus.tsx` | Source/metadata uncertainty, actual event state, EN import, offsets болон active movie cue. |
| `ManualWordPanel.tsx` | Англи үгийн өөрийн meaning/grammar/context; утга оруулж байж хадгална. |
| `LearningDock.tsx` | Movie-specific controls, target дээр sample option үгүй, manual note panel. |
| `useLesson.ts` | Sample-ийг зөвхөн sample source сонгосон үед татна. |
| `useLearningController.ts` | Native болон movie event clock ялгах; movie-scoped quiz, provenance/TMDB notes. |
| `LearningPanels.tsx` | Real adapter seek/pause, manual word selection, context quiz unavailable state. |
| `SubtitleTranscript.tsx` | MN-only/EN import, manual token selection, 50 cue pagination. |
| `LearningProgress.tsx` | Clock unknown үед 00:00 гэж дүр эсгэхгүй. |
| `VocabularyPanel.tsx` | User-note provenance болон grammar харуулна. |
| `types.ts`, `storage.ts` | Backward-compatible optional provenance/TMDB/context/grammar fields. |
| `tests/learning.test.mjs` | Transport security, real/unknown clock distinction, offsets, storage compatibility. |
| `tests/browser/spider-man.spec.ts` | Real guest audit ба тусдаа labeled protocol fixture. |
| `scripts/audit-spider-man.mjs` | Mock-гүй live audit JSON/screenshot; film verification flags false. |
| `.github/workflows/scenechain.yml` | Dedicated feature branch-д existing Node 22 CI ажиллуулна. |

Component нэртэй файлууд `src/components/learning/` дотор, lib нэртэй файлууд
`src/lib/learning/` дотор. Payment/authentication/production DB/DNS/secret settings
өөрчлөгдөөгүй; uncommitted subtitle/payment файлуудыг commit/deploy-д оруулахгүй.

## Багшид юу хэлэх вэ?

“Би existing Spider-Man watch page дээр transcript болон player API adapter
холбосон. CineSrc-ийн зөв iframe-аас valid time ирсэн үед л хадмал цаг дагана;
seek амжилтыг буцаасан event-ээр шалгана. Одоогийн Монгол файл баталгаажаагүй,
English transcript нь хэрэглэгчийн импорт. Үгийн тайлбар миний оруулсан note,
AI тайлбар гэж нэрлээгүй. Real-film authenticated playback, translation accuracy,
scene context болон лицензийг бүрэн баталгаажуулсан гэж хэлэхгүй.”

Бүрэн film-specific verification хийхэд authorized playback source/test session,
ижил release-ийн EN/MN transcript, source/license metadata хэрэгтэй. Дараа нь
киноны эхлэл/дунд/сүүл хэсэг, pause/seek, cut/offset, үгийн утга болон scene quiz-ийг
бодит footage-той тулгаж шалгана. DRM/auth/VIP-ийг тойрох аргаар энэ дутууг нөхөхгүй.
