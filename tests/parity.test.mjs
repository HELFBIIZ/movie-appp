import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const root = fileURLToPath(new URL('..', import.meta.url));
const production = 'c120658b904a2942134f31323a54f78d414659b5';

// Compare public results with the immutable production implementation, not a rewritten oracle.
function loadModule(file, original = false, cache = new Map()) {
  if (cache.has(file)) return cache.get(file);
  const read = (name) =>
    original
      ? execFileSync('git', ['show', `${production}:${name.replaceAll('\\', '/')}`], {
          cwd: root,
          encoding: 'utf8',
          maxBuffer: 5000000,
        })
      : fs.readFileSync(path.join(root, name), 'utf8');
  if (file.endsWith('.json')) return JSON.parse(read(file));
  const exports = {};
  cache.set(file, exports);
  const source = ts.transpileModule(read(file), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const require = (specifier) => {
    if (specifier === 'next/server')
      return { NextResponse: { json: (body, init) => ({ body, ...init }) } };
    if (!specifier.startsWith('.'))
      throw new Error(`Unexpected dependency in parity test: ${specifier}`);
    let target = path.join(path.dirname(file), specifier);
    if (!path.extname(target)) target += '.ts';
    return loadModule(target, original, cache);
  };
  vm.runInNewContext(
    source,
    {
      exports,
      require,
      Date,
      URL,
      Number,
      RegExp,
      window: { location: { origin: 'https://vxnta.fixture.test' } },
    },
    { filename: file },
  );
  return exports;
}
const plain = (value) => JSON.parse(JSON.stringify(value));
const current = (stem, oldExtension = 'js') =>
  fs.existsSync(path.join(root, `src/lib/${stem}.ts`))
    ? `src/lib/${stem}.ts`
    : `src/lib/${stem}.${oldExtension}`;

test('complete catalog, artwork, lookup, recommendations and ordering match production', () => {
  const before = loadModule('src/lib/movies.js', true);
  const after = loadModule(current('movies'));
  for (const key of [
    'movies',
    'fallbackMovies',
    'featuredMovie',
    'upcomingMovies',
    'topRatedMovies',
    'kdramaMovies',
    'popularMovies',
    'westernMovies',
    'kdramas2026',
    'allGenres',
  ]) {
    assert.deepEqual(plain(after[key]), plain(before[key]), key);
  }
  for (const slug of ['inception', 'spider-man-brand-new-day', 'missing', '', undefined]) {
    assert.equal(
      JSON.stringify(after.getMovieBySlug(slug)),
      JSON.stringify(before.getMovieBySlug(slug)),
    );
  }
  for (const genre of [...before.allGenres, 'missing']) {
    assert.deepEqual(plain(after.getMoviesByGenre(genre)), plain(before.getMoviesByGenre(genre)));
  }
  for (const count of [0, 1, 6, 20]) {
    for (const movie of [undefined, before.movies[0], before.movies[10]]) {
      assert.deepEqual(
        plain(after.getRecommendations(movie, count)),
        plain(before.getRecommendations(movie, count)),
      );
    }
    assert.deepEqual(
      plain(after.getTopRecentlyAdded(count)),
      plain(before.getTopRecentlyAdded(count)),
    );
    assert.deepEqual(plain(after.getTrendingMovies(count)), plain(before.getTrendingMovies(count)));
  }
});

test('validation retains coercion, empty values, stateful patterns and response errors', async () => {
  const before = loadModule('src/lib/validate.mjs', true);
  const after = loadModule(current('validate', 'mjs'));
  const values = [
    undefined,
    null,
    '',
    'abc',
    '123',
    '1.5',
    ' 2 ',
    0,
    1.5,
    -1,
    true,
    false,
    [],
    {},
    NaN,
  ];
  for (const value of values) {
    for (const name of ['str', 'optStr', 'reqStr', 'intBetween']) {
      assert.deepEqual(
        plain(after[name](value)),
        plain(before[name](value)),
        `${name}: ${String(value)}`,
      );
    }
    assert.deepEqual(
      plain(after.oneOf(value, values.slice(0, 4))),
      plain(before.oneOf(value, values.slice(0, 4))),
    );
  }
  const previousPattern = /a/g;
  const currentPattern = /a/g;
  for (let i = 0; i < 4; i++) {
    assert.deepEqual(
      plain(after.reqStr('aaa', { pattern: currentPattern })),
      plain(before.reqStr('aaa', { pattern: previousPattern })),
    );
  }
  for (const checks of [
    [],
    [{ ok: true }],
    [
      { ok: false, value: 0, field: 'amount' },
      { ok: false, field: 'later' },
    ],
  ]) {
    assert.deepEqual(plain(after.all(...checks)), plain(before.all(...checks)));
  }
  assert.deepEqual(
    plain(after.badInput('message', 'field')),
    plain(before.badInput('message', 'field')),
  );
  assert.deepEqual(
    plain(
      await after.parseJsonBody({
        json: async () => {
          throw new Error();
        },
      }),
    ),
    {},
  );
});

test('legacy subtitle formatting and constant values remain unchanged', () => {
  const before = loadModule('src/lib/subtitles-format.js', true);
  const after = loadModule(current('subtitles-format'));
  for (const input of [
    '',
    '\uFEFFWEBVTT\r\n\r\n00:00:01.000 --> 00:00:02.000\r\nHello\r\n',
    '1\n00:00:01,000 --> 00:00:02,000\nLine one\nLine two\n\n2\n00:00:03,000 --> 00:00:04,000\nSecond',
    'corrupt input',
  ]) {
    assert.equal(after.normalizeToVtt(input), before.normalizeToVtt(input));
    assert.deepEqual(plain(after.parseCues(input)), plain(before.parseCues(input)));
  }
  assert.deepEqual(
    plain(loadModule(current('const'))),
    plain(loadModule('src/lib/const.js', true)),
  );
});

test('provider URL builders preserve movie, TV and missing ID behavior', () => {
  const source = execFileSync('git', ['show', `${production}:src/app/watch/[slug]/page.js`], {
    cwd: root,
    encoding: 'utf8',
  });
  const functions = source.slice(
    source.indexOf('function vidsrcUrl'),
    source.indexOf('export default function WatchPage'),
  );
  const before = vm.runInNewContext(
    functions + '\n({vidsrcUrl, cinesrcUrl, superEmbedUrl, embedMasterUrl, embedApiStreamUrl})',
    { window: { location: { origin: 'https://vxnta.fixture.test' } }, URL },
  );
  const after = loadModule('src/lib/watch/providers.ts');
  // vidsrcUrl intentionally moved off the retired vidsrcme.ru domain.
  delete before.vidsrcUrl;
  for (const movie of [undefined, null, { tmdbId: 0 }, { tmdbId: 969681 }, { tmdbId: '969681' }]) {
    if (!movie?.tmdbId) {
      assert.equal(after.vidsrcUrl(movie, false, 1, 1, 'movie-S01E01'), null);
    } else {
      assert.match(after.vidsrcUrl(movie, false, 1, 1), /^https:\/\/bingeapi\.st\/embed\/movie\//);
      assert.match(
        after.vidsrcUrl(movie, true, 2, 4),
        /^https:\/\/bingeapi\.st\/embed\/tv\/\d+\/2\/4/,
      );
    }
    for (const isTV of [false, true]) {
      for (const [season, episode, subSlug] of [
        [1, 1, undefined],
        [0, 0, 'a slug/season'],
        [2, 4, 'movie-S02E04'],
      ]) {
        for (const name of Object.keys(before))
          assert.equal(
            after[name](movie, isTV, season, episode, subSlug),
            before[name](movie, isTV, season, episode, subSlug),
          );
      }
    }
  }
});
