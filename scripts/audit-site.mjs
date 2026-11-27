import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { parseExistingVtt } from '../src/lib/learning/movie.ts';
import { hasMongolianMeaning } from '../src/lib/learning/sentence-text.ts';

const root = process.cwd();
const directory = path.join(root, 'docs', 'audit');
fs.mkdirSync(directory, { recursive: true });
const modules = new Map();
function load(file) {
  if (modules.has(file)) return modules.get(file);
  const input = fs.readFileSync(path.join(root, file), 'utf8');
  if (file.endsWith('.json')) return JSON.parse(input);
  const exports = {};
  modules.set(file, exports);
  const require = (specifier) => {
    if (!specifier.startsWith('.')) throw new Error(`Unexpected catalog dependency: ${specifier}`);
    let next = path.join(path.dirname(file), specifier);
    if (!path.extname(next)) next += '.ts';
    return load(next);
  };
  const output = ts.transpileModule(input, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(output, { exports, require, Date, URL, Number, RegExp }, { filename: file });
  return exports;
}
function files(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((item) =>
      item.isDirectory()
        ? files(path.join(directory, item.name))
        : [path.join(directory, item.name)],
    );
}
const movies = JSON.parse(JSON.stringify(load('src/lib/movies.ts').movies));
const manifest = JSON.parse(fs.readFileSync('data/subtitles/manifest.json', 'utf8'));
const aliases = JSON.parse(fs.readFileSync('data/subtitles/aliases.json', 'utf8'));
const tracks = Object.entries(manifest).map(([key, meta]) => {
  const file = path.resolve('data/subtitles', meta.file ?? `${key}.vtt`);
  const allowed = file.startsWith(path.resolve('data/subtitles') + path.sep);
  if (!allowed || !fs.existsSync(file))
    return { key, present: false, cues: 0, mongolianCues: 0, partial: true };
  try {
    const input = fs.readFileSync(file, 'utf8');
    const cues = parseExistingVtt(input);
    const translated = cues.filter((cue) => hasMongolianMeaning(cue.text)).length;
    return {
      key,
      present: true,
      bytes: Buffer.byteLength(input),
      cues: cues.length,
      mongolianCues: translated,
      untranslatedCues: cues.length - translated,
      partial: Boolean(
        meta.partial || translated < cues.length * 0.98 || (meta.translatedLineRatio ?? 1) < 0.98,
      ),
      markedPartial: Boolean(meta.partial || (meta.translatedLineRatio ?? 1) < 0.98),
      source: meta.source ?? '',
      sourceDetail: meta.sourceDetail ?? '',
      identityVerified: false,
      semanticAccuracyVerified: false,
      first: cues[0]?.start ?? null,
      last: cues.at(-1)?.end ?? null,
    };
  } catch {
    return { key, present: true, cues: 0, mongolianCues: 0, partial: true, parseError: true };
  }
});
const byKey = new Map(tracks.map((track) => [track.key, track]));
for (const [alias, original] of Object.entries(aliases))
  if (byKey.has(original)) byKey.set(alias, byKey.get(original));
const catalog = movies.map((movie) => {
  const tv = ['kdrama', 'western', 'tv', 'series'].includes(movie.category) && movie.episodes > 1;
  const key = tv ? `${movie.slug}-S01E01` : movie.slug;
  const track = byKey.get(key);
  const episodes = tv ? tracks.filter((track) => track.key.startsWith(`${movie.slug}-S`)) : [];
  return {
    slug: movie.slug,
    title: movie.title,
    category: movie.category,
    year: movie.year,
    tmdbId: movie.tmdbId ?? null,
    mediaType: tv ? 'tv' : 'movie',
    episodes: movie.episodes ?? 0,
    seasons: movie.seasons ?? 0,
    runtime: movie.runtime,
    languages: movie.language,
    director: movie.director,
    cast: movie.cast,
    genres: movie.genres,
    watchPath: `/watch/${movie.slug}`,
    moviePath: `/movie/${movie.slug}`,
    subtitleKey: key,
    subtitleAvailable: Boolean(track?.mongolianCues),
    subtitleCues: track?.cues ?? 0,
    mongolianCues: track?.mongolianCues ?? 0,
    subtitlePartial: track?.partial ?? true,
    subtitleEpisodeFiles: episodes.length,
    unscopedSeriesFile: tv && byKey.has(movie.slug),
    movieIdentityVerified: false,
    translationQualityVerified: false,
  };
});
const sourceFiles = files(path.join(root, 'src'));
const routes = sourceFiles
  .filter((file) => /[\\/]route\.(?:js|ts|mjs)$/.test(file))
  .map((file) => {
    const text = fs.readFileSync(file, 'utf8');
    return {
      path:
        '/' + path.relative(path.join(root, 'src/app'), path.dirname(file)).replaceAll('\\', '/'),
      methods: [
        ...text.matchAll(
          /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g,
        ),
      ].map((match) => match[1]),
      source: path.relative(root, file).replaceAll('\\', '/'),
      sessionGuardReferenced: /requireUser/.test(text),
      adminGuardReferenced: /ADMIN|requireAdmin/.test(text),
      subscriptionGuardReferenced: /canWatch/.test(text),
      webhookOrCron: /webhooks|cron/.test(file),
      clerkGuardReferenced: /auth\(\)|currentUser/.test(text),
    };
  });
const pages = sourceFiles
  .filter((file) => /[\\/]page\.(?:js|tsx|mjs)$/.test(file))
  .map(
    (file) =>
      '/' + path.relative(path.join(root, 'src/app'), path.dirname(file)).replaceAll('\\', '/'),
  );
const environmentNames = [
  ...new Set(
    sourceFiles.flatMap((file) =>
      [...fs.readFileSync(file, 'utf8').matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)].map(
        (match) => match[1],
      ),
    ),
  ),
].sort();
const duplicates = [
  ...new Set(
    catalog
      .filter((movie, i) => catalog.findIndex((other) => other.slug === movie.slug) !== i)
      .map((movie) => movie.slug),
  ),
];
const report = {
  generatedAt: new Date().toISOString(),
  verificationScope:
    'Static effective catalog and local assets only. A Cyrillic cue is not proof of Mongolian semantic accuracy, licensed provenance, media identity, or actual player playback.',
  totals: {
    catalogEntries: catalog.length,
    uniqueSlugs: new Set(catalog.map((movie) => movie.slug)).size,
    missingTmdbIds: catalog.filter((movie) => !movie.tmdbId).length,
    tvEntries: catalog.filter((movie) => movie.mediaType === 'tv').length,
    defaultSubtitleAvailable: catalog.filter((movie) => movie.subtitleAvailable).length,
    defaultSubtitleMissing: catalog.filter((movie) => !movie.subtitleAvailable).length,
    subtitleAssets: tracks.length,
    markedPartial: tracks.filter((track) => track.markedPartial).length,
    detectedPartial: tracks.filter((track) => track.partial).length,
    translatedCuePresence: tracks.reduce((sum, track) => sum + track.mongolianCues, 0),
    untranslatedCuePresence: tracks.reduce((sum, track) => sum + (track.untranslatedCues ?? 0), 0),
    pageRoutes: pages.length,
    apiRoutes: routes.length,
  },
  categories: Object.fromEntries(
    [...new Set(catalog.map((movie) => movie.category))].map((category) => [
      category,
      catalog.filter((movie) => movie.category === category).length,
    ]),
  ),
  duplicates,
  subtitleAliases: aliases,
  databaseTables: [
    ...new Set(
      [
        fs.readFileSync('data/db/schema.sql', 'utf8'),
        ...sourceFiles
          .filter((file) => /[\\/]db[\\/]/.test(file))
          .map((file) => fs.readFileSync(file, 'utf8')),
      ].flatMap((text) =>
        [...text.matchAll(/CREATE TABLE(?: IF NOT EXISTS)?\s+([a-z_]+)/gi)].map(
          (match) => match[1],
        ),
      ),
    ),
  ].sort(),
  catalog,
  tracks,
  pages,
  routes,
  environmentNames,
};
fs.writeFileSync(
  path.join(directory, 'site-inventory.json'),
  JSON.stringify(report, null, 2) + '\n',
);
const columns = [
  'slug',
  'title',
  'mediaType',
  'category',
  'tmdbId',
  'year',
  'runtime',
  'languages',
  'genres',
  'director',
  'episodes',
  'seasons',
  'subtitleKey',
  'subtitleAvailable',
  'mongolianCues',
  'subtitlePartial',
  'subtitleEpisodeFiles',
  'unscopedSeriesFile',
  'watchPath',
];
const csv = (row) =>
  row
    .map((value) => {
      const text = String(value ?? '');
      return `"${(/^[=+\-@\t\r]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`;
    })
    .join(',');
fs.writeFileSync(
  path.join(directory, 'catalog-subtitles.csv'),
  '\uFEFF' +
    [csv(columns), ...catalog.map((movie) => csv(columns.map((column) => movie[column])))].join(
      '\r\n',
    ) +
    '\r\n',
);
process.stdout.write(
  JSON.stringify({ totals: report.totals, categories: report.categories, duplicates }) + '\n',
);
