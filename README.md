# VXNTA

VXNTA is a movie discovery site built with Next.js. It includes a homepage hero, searchable movie carousels, genre pages, a watchlist, and trailer/watch screens.

## Features

- Homepage with hero banner and movie rows
- Search by title
- Filter by genre
- Multi-page movie details
- Watchlist using localStorage
- User reviews & ratings
- Trailer embed pages
- TMDB-ready API layer with a large local fallback catalog (70+ films)

## Local development

```bash
npm install
npm run dev
```

Then open http://localhost:3000

## TMDB setup

Create a local environment file:

```bash
cp .env.example .env.local
```

Add your TMDB API key:

```env
TMDB_API_KEY=your_tmdb_read_access_token_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

If no key is present, the app falls back to the bundled movie catalog.

## GitHub setup

```bash
git init
# optional if repo already exists
git add .
git commit -m "Initial movie app"
git branch -M main
```

Then push to GitHub:

```bash
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

## Vercel deployment

1. Go to https://vercel.com
2. Import the GitHub repository
3. In project settings, add environment variables:
   - `TMDB_API_KEY`
   - `NEXT_PUBLIC_APP_URL`
4. Deploy the project

## Notes

This project is a public movie catalog and trailer site. It does not host full copyrighted video files; it uses trailer embeds and public poster metadata.
