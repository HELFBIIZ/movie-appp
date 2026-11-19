# SceneChain Learning — classroom Next.js demo

This standalone Next.js + React + TypeScript demo is intentionally placed in scenechain-demo to preserve the original movie app. It was created with AI assistance; review and learn the source before explaining it.

Features: HTML5 video, bilingual timed captions, seek, word meanings, localStorage vocabulary, scene and word quizzes, basic SRS, and two-file EN/MN WebVTT import.

The default video is an MDN CC0 flower example. Captions are synthetic educational text, not speech transcription. You can select a local video and import corresponding bilingual VTT files.

Not implemented: Clerk, Supabase, Drizzle, Hugging Face, Pinecone, n8n, Facebook Graph API, Wire.mn, external movie iframe API, or user accounts.

Run with Node 22: cd scenechain-demo; npm install; npm run dev. Open localhost:3000. Check npm run typecheck and npm run build.

Deploy: Vercel -> Add New Project -> Import HELFBIIZ/movie-appp as a NEW project -> set Root Directory to scenechain-demo -> Next.js preset -> Deploy. Do not edit your existing movie-appp Vercel project's root. Verify the public URL manually.

Code map: src/app/page.tsx is React UI and state; src/app/layout.tsx wraps pages; src/app/globals.css handles layout. Browser video timeupdate updates React time; matching subtitle is found by start/end; clicking an English word selects it; saving writes JSON into localStorage; quiz answers update score and SRS dueAt.

This is an MVP demo, not a fully completed Pinebaatars stack. Build and live deployment have not been verified in this environment.
