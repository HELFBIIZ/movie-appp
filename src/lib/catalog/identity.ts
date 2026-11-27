import type { Movie } from '../../types/movie';

// Preserve the first existing URL. Later same-name titles receive distinct
// routes; a 2014 film must not silently open a same-name television series.
export function assignCatalogSlugs(entries: Movie[]): Movie[] {
  const seen = new Set<string>();
  return entries.map((movie) => {
    let slug = movie.slug;
    if (seen.has(slug)) {
      const base = `${slug}-${movie.year}`;
      slug = base;
      for (let index = 2; seen.has(slug); index++) slug = `${base}-${index}`;
    }
    seen.add(slug);
    return slug === movie.slug ? movie : { ...movie, slug };
  });
}
