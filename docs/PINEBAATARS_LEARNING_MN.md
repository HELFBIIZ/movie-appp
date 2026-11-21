# Кодоо ойлгож тайлбарлах хөтөч

Энэ өөрчлөлтийг Codex AI-ийн тусламжтай бэлтгэсэн. Өөрөө бичсэн гэж тайлбарлахын оронд доорх кодыг уншиж, дасгалуудыг өөрөө хийж ойлгосноо харуулаарай.

## 1. Суурь хувилбар ба нөөц

- **Файл:** `REFACTOR_BASELINE.md`, `tests/browser/regression.spec.ts`, `tests/parity.test.mjs`, `tests/store.test.mjs`.
- **Яагаад:** production нь хуучин `main`-ээс өөр. `c120658`-ийг суурь болгож, таны commit хийгээгүй ажлыг эх checkout-д нь хадгалсан.
- **Код:** `appearance` зураг харьцуулна; parity loader production-ийн Git хувилбарыг уншина; store test түр SQLite сан үүсгээд зөвхөн тэнд ажиллана.
- **Ойлгох функц:** `appearance`, `loadModule`, `spawnSync`.
- **Шалгалт:** өөрчлөхийн өмнөх build, 17 хуучин unit, 12 хуучин browser болон 15 regression шалгалт. Дэлгэрэнгүй үр дүн `TEST_REPORT.md`-д бий.
- **Дасгал:** `/help` хуудсанд нэг browser assertion нэмээд эх хувилбар дээр ажиллуулаарай.
- **Багшийн 3 асуулт:** baseline гэж юу вэ? Branch яагаад production-той адил байх албагүй вэ? Нөөц reference ба ажлын файлын хуулбар юугаараа өөр вэ?

## 2. Фолдерын үүрэг

- **Файл:** `src/db/index.mjs`, `components/header`, `components/watch`, `lib/catalog`, `types`; `FOLDER_STRUCTURE.md`.
- **Яагаад:** UI, цэвэр тооцоолол, SQL, өгөгдлийн төрлийг ялгаж кодыг олоход хялбар болгоно.
- **Код:** нэг database client ашиглана; store болон XP ledger-ийн өмнөх SQL үйлдлийг хадгалсан. Шинэ duplicate client үүсгээгүй.
- **Ойлгох функц:** `getDb`, `getClient`, `getPlayerTabs`.
- **Шалгалт:** түр сангийн signup/session/profile/favorites/VIP шалгалт; import-уудын typecheck/build.
- **Дасгал:** нэг watch хүсэлтийн page → API → store урсгалыг цаасан дээр зур.
- **Багшийн 3 асуулт:** фолдер солиход URL өөрчлөгдөх үү? Store яагаад server-only вэ? Source файл нүүхэд database файл яагаад нүүгээгүй вэ?

## 3. JavaScript → TypeScript

- **Файл:** `movies.ts`, `catalog/{curated,art}.ts`, `validate.ts`, `subtitles-format.ts`, `types/*.ts`.
- **Яагаад:** movie, profile, төлбөр, хадмалын бүтэц болон боломжит null утгыг ил тод болгоно.
- **Код:** `Movie` нь бодит JSON-ийг дүрсэлнэ. Зарим TMDB ID string тул `number | string` гэж тэмдэглэсэн; утгыг өөрчлөөгүй. Null rating-ийн өмнөх тооцооллыг `Number(...)`-оор илэрхийлсэн.
- **Ойлгох функц:** `getMovieBySlug`, `getRecommendations`, `reqStr`, `intBetween`.
- **Шалгалт:** бүх каталог, зураг, шүүлт, recommendation болон validation-ийн parity тест.
- **Дасгал:** `getMovieBySlug`-ийн үр дүн undefined байх тохиолдлыг өөрийн жижиг функцээр боловсруул.
- **Багшийн 3 асуулт:** interface runtime дээр шалгах уу? Unknown ба any юугаараа өөр вэ? Type нэмэх нь өгөгдлийг хөрвүүлдэг үү?

## 4. Чанарын хэрэгслүүд

- **Файл:** `package.json`, `eslint.config.mjs`, `.prettierrc.json`, `.gitattributes`, `.husky/pre-commit`, `lint-staged.config.mjs`, `.github/workflows/ci.yml`, `.env.example`.
- **Яагаад:** нэг ижил Node, формат, lint/type дүрмээр local болон CI ажиллана.
- **Код:** Husky staged файлыг шалгана; CI цэвэр install хийж бүх шалгалтыг давтана. Main нь нэг review, амжилттай `VXNTA quality` шаарддаг.
- **Ойлгох функц:** `prepare-hooks.mjs` дахь hook хадгалах нөхцөл, `check-visual-regression.mjs` дахь `capture`.
- **Шалгалт:** алдаатай `any` probe commit зогссон; зөв commit-ууд hook-оор давсан. Эцсийн checks-ийг test report-оос хар.
- **Дасгал:** өөрийн түр branch-д ашиглаагүй хувьсагч нэмээд lint-ийн алдааг унш; дараа нь устга.
- **Багшийн 3 асуулт:** Prettier ба ESLint ямар ялгаатай вэ? Pre-commit байхад CI яагаад хэрэгтэй вэ? Нууц утгыг `.env.example`-д яагаад бичиж болохгүй вэ?

## 5. Header ба серверийн жижиг migration

- **Файл:** `Header.tsx`, `header/*.tsx`, `ui/{button,dropdown-menu}.tsx`, `api/payment-options/route.ts`.
- **Яагаад:** том Header-ийг 94 мөр болгож, native HTML props болон API response-ийг typed болгосон.
- **Код:** Header login төлөвийг уншина; desktop/mobile хэсэг ижил DOM үүсгэнэ. `sessionIndicatorSchema` гаднаас ирсэн JSON-ийг шалгана. Энэ нь серверийн admin эрх олгодоггүй.
- **Ойлгох функц:** `handleLogout`, `DropdownMenuTrigger`, `DropdownMenuContent`, `GET`.
- **Шалгалт:** navigation, theme, profile, login/logout, admin харагдах байдал, payment-options болон зураг харьцуулалт.
- **Дасгал:** Button-ийн `size` төрөлд байхгүй утга өгөхөд compiler юу хэлэхийг шалгаад буцаа.
- **Багшийн 3 асуулт:** React props яагаад төрөлтэй байх ёстой вэ? Client дээр admin холбоос харагдах нь эрхийн баталгаа мөн үү? Component салгахдаа нэмэлт div яагаад оруулаагүй вэ?

## 6. Watch ба SceneChain

- **Файл:** `watch/[slug]/page.tsx`, `components/watch/*`, `lib/watch/providers.ts`, learning adapter-ийн type annotation.
- **Яагаад:** page-ийг 185 мөр болгож, зөвшөөрөл, provider URL, iframe, episode хэсгийг ойлгомжтой салгасан.
- **Код:** `useWatchAccess` хуучин API-г дуудна; `watchAccessSchema` JSON-ийг шалгана. Серверийн subscription/role шийдвэр өөрчлөгдөөгүй. Provider солих, хадмал, learning dock өмнөх замаараа ажиллана.
- **Ойлгох функц:** `useWatchAccess`, `getPlayerTabs`, `MoviePlayer`, `useMoviePlayer`.
- **Шалгалт:** таван URL-ийн parity; guest/VIP gate; CineSrc protocol fixture; local video/VTT, үг хадгалах, quiz, SRS.
- **Дасгал:** TV season 2, episode 4-ийн таван URL-ийг тестээр гаргаж, ялгааг тайлбарла.
- **Багшийн 3 асуулт:** Iframe-ийн цагийг зохиомлоор тооцож болох уу? Mock provider тест бодит кино үзэгдсэнийг батлах уу? Type annotation өөрчлөх нь protocol comparison-ийг өөрчилдөг үү?

## 7. Шинэ feature-ийг тусад нь хөгжүүлэх

- **Файл:** одоогийн `components/learning`, `lib/learning`; өмнөх assessment feature өөрийн branch-д үлдсэн.
- **Яагаад:** refactor ба шинэ зан төлөвийг нэг PR-д хольвол регрессийн шалтгааныг ялгахад хэцүү.
- **Код:** одоогийн progress/SRS, vocabulary, original lesson хадгалагдсан. Supabase, AI, vector DB, automation-ийг зөвхөн бодит хэрэгцээтэй тусдаа feature-д холбоно.
- **Ойлгох функц:** `persistProgress`, `reviewItem`, `parseVtt`.
- **Шалгалт:** learning unit болон browser тестүүд; шинэ гаднын service-тэй холбоогүй.
- **Дасгал:** шинэ vocabulary feature-ийн оролт/гаралт, зөвшөөрөлтэй материалын эх үүсвэр, хэрэгтэй service-ийг нэг нүүрээр тодорхойл.
- **Багшийн 3 асуулт:** Refactor ба feature ямар ялгаатай вэ? Туршиж буй шинэ feature-д өөр database заавал хэрэгтэй юу? Зөвшөөрөлтэй материал гэдгийг яаж батлах вэ?

## 8. Review, нотолгоо, буцаах

- **Файл:** `TEST_REPORT.md`, `FINAL_CHANGELOG.md`, `FILE_MIGRATION_MAP.md`, PR-ийн evidence.
- **Яагаад:** reviewer өмнөх/дараах дүрс, тест, өөрчлөлтийн хүрээг бие даан үнэлнэ.
- **Код:** CI production commit-ийг тусдаа түр worktree-д build хийж, ижил browser дээр before/after харьцуулна. Test store жинхэнэ хэрэглэгчийн DB-г нээхгүй.
- **Ойлгох функц:** visual script-ийн `run`, `capture`, `finally` cleanup.
- **Шалгалт:** эцсийн lint/types/format/unit/build/browser болон route inventory-ийн харьцуулалт.
- **Дасгал:** PR-ийг deploy хийхгүйгээр шалгах 5 алхам, deploy хийсэн тохиолдолд commit буцаах төлөвлөгөө бич.
- **Багшийн 3 асуулт:** Ямар зүйлсийг бодитоор шалгаагүй вэ? Before/after screenshot юуг баталж чадахгүй вэ? Rollback хийхдээ database-г яагаад reset хийж болохгүй вэ?
