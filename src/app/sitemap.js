import { movies } from "@/lib/movies"

const base = "https://vxnta.app"

const staticRoutes = [
  "",
  "/movies",
  "/movies?category=top-rated",
  "/movies?category=upcoming",
  "/movies?category=kdrama",
  "/movies?category=western",
  "/movies?category=western-modern",
  "/pricing",
  "/help",
  "/login",
  "/streaming",
  "/watchlist",
]

export default function sitemap() {
  const movieRoutes = movies.slice(0, 2000).map((m) => ({
    url: `${base}/movie/${m.slug}`,
    lastModified: new Date(),
    priority: 0.6,
  }))

  return [
    ...staticRoutes.map((r) => ({
      url: `${base}${r}`,
      lastModified: new Date(),
      priority: r === "" ? 1 : 0.8,
    })),
    ...movieRoutes,
  ]
}