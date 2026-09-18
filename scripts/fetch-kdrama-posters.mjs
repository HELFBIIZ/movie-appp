// Resolves exact poster + backdrop URLs from TheMovieDB's public CDN for
// every K-drama in the catalog. TMDb treats K-dramas as TV shows and Korean
// films as movies, so this parses BOTH media types from the search page and
// matches strictly (token overlap + year proximity) to avoid wrong posters.
// Entries with no reliable match stay null and keep the generated artwork.
//
// Usage: node scripts/fetch-kdrama-posters.mjs
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', 'src', 'lib', 'kdrama-posters.json')
const posterBase = 'https://image.tmdb.org/t/p/w500'
const bannerBase = 'https://image.tmdb.org/t/p/w1280'

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
const delay = (ms) => new Promise((r) => setTimeout(r, ms))

async function get(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
      redirect: 'follow',
    })
    if (res.ok) return await res.text()
    if (res.status === 429 || res.status === 503) {
      await delay(2000 * (attempt + 1))
      continue
    }
    throw new Error(`HTTP ${res.status}`)
  }
  throw new Error('rate limited after retries')
}

// One result card. Both movie and TV cards share the same shape; movies carry
// a slug in the href, TV cards do not.
//   <a ... data-media-type="tv" ... href="/tv/{id}-{slug}?">
//     <img ... w94_and_h141_face/{posterPath} />
//   <h2><span>{Title}</span><span class="font-light"> (Alt)</span></h2>
//   <span class="release_date ...">March 9, 2024</span>
const CARD_RE =
  /<a class="flex w-full"[^>]*data-media-type="(tv|movie)" data-media-adult="false" href="\/(?:tv|movie)\/(\d+)(-[^"]*)?"[\s\S]*?w94_and_h141_face\/([A-Za-z0-9_./-]+?)(?: |")[\s\S]*?<h2[^>]*>[\s\S]*?<span>([^<]*)<\/span>[\s\S]*?<span class="release_date[^>]*>([^<]*)<\/span>/g

const DATE_YEAR_RE = /(19|20)\d{2}/

function parseCards(html) {
  const cards = []
  let m
  while ((m = CARD_RE.exec(html)) !== null) {
    cards.push({
      media: m[1],
      id: m[2],
      hrefSlug: (m[3] || '').replace(/^-/, ''),
      poster: m[4],
      title: m[5].trim(),
      date: m[6].trim(),
    })
  }
  return cards
}

function yearFromDate(date) {
  const m = DATE_YEAR_RE.exec(date || '')
  return m ? Number(m[0]) : null
}

function normalize(s) {
  const decoded = String(s)
    .replace(/'/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, '')
    .replace(/\./g, '')
  return decoded
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function tokens(s) {
  return normalize(s).split(' ').filter(Boolean)
}

function overlap(a, b) {
  if (!a.length || !b.length) return 0
  const set = new Set(a)
  const common = b.filter((t) => set.has(t)).length
  return common / Math.min(a.length, b.length)
}

// K-dramas are TV shows on TMDb; Korean films are movies. A catalog entry is a
// drama unless it is one of the t/tK titles below that are actually films, so we
// FIRST prefer a strong TV match, and only fall back to a movie card when no TV
// show matches (movies never have a strong TV lookalike for these titles).
const FILM_SLUGS = new Set([
  'the-host', 'memories-of-murder', 'the-man-from-nowhere', 'i-saw-the-devil',
  'the-handmaiden', 'burning', 'poetry', 'secret-sunshine', 'decision-to-leave',
  'thirst', 'the-chaser', 'save-the-green-planet', 'the-yellow-sea', 'silmido',
  '1987-when-the-day-comes', 'a-hard-day', 'sympathy-for-mr-vengeance',
  'lady-vengeance', 'a-bittersweet-life', 'peppermint-candy', 'tell-me-something',
  'jsa-joint-security-area', 'the-attorney', 'the-drug-king', 'illang-the-wolf-brigade',
  'steel-rain', 'along-with-the-gods-the-two-worlds', 'hunt', 'emergency-declaration',
  'broker', 'the-roundup', 'kingmaker', 'the-night-owl', 'unlocked', 'sinkhole',
  'new-world', 'so-not-worth-it', 'parasite', 'oldboy',
])

function pickBest(cards, title, year, slug) {
  if (!cards.length) return null
  const targetTok = tokens(title)
  const baseSlug = normalize(title).replace(/\s+/g, '-')
  const isFilm = FILM_SLUGS.has(slug)

  const scored = cards.map((card) => {
    const cardYear = yearFromDate(card.date)
    const yearOk = cardYear == null || cardYear === year || Math.abs(cardYear - year) <= 1
    const cardTok = tokens(card.title)
    const ov = overlap(targetTok, cardTok)

    let score = 0
    if (targetTok.length === 1) {
      // Short titles must match exactly to avoid collisions (W, Black, Hunt).
      if (targetTok[0] === cardTok[0] && cardTok.length === 1 && yearOk) score = 100
    } else {
      if (ov >= 0.7 && yearOk) score = 90 + Math.round(ov * 10)
    }
    // Movie cards: slug containment is a strong signal (movie href has slug).
    if (card.media === 'movie') {
      const cardSlug = card.hrefSlug || normalize(card.title).replace(/\s+/g, '-')
      const base = baseSlug.replace(/-+/g, '-')
      const c = cardSlug.replace(/-+/g, '-')
      if ((c.includes(base) || base.includes(c)) && yearOk) {
        score = Math.max(score, 95 + Math.round(ov * 5))
      }
    }
    return { card, score, ov, cardYear }
  })

  const bestTV = scored.filter((s) => s.card.media === 'tv').sort((a, b) => b.score - a.score)[0]
  const bestMovie = scored.filter((s) => s.card.media === 'movie').sort((a, b) => b.score - a.score)[0]

  // Films: a matching movie card wins. Dramas: a strong TV card always wins
  // over a lookalike movie card (e.g. Hierarchy drama vs a foreign film).
  if (isFilm) {
    if (bestMovie && bestMovie.score >= 95) return bestMovie.card
    return bestTV && bestTV.score >= 95 ? bestTV.card : null
  }
  if (bestTV && bestTV.score >= 95) return bestTV.card
  if (bestMovie && bestMovie.score >= 95) return bestMovie.card
  return null
}

async function findArt(id, media) {
  const path = media === 'movie' ? 'movie' : 'tv'
  const html = await get(`https://www.themoviedb.org/${path}/${id}`)
  const poster =
    html.match(/og:image[^>]*content="https:\/\/media\.themoviedb\.org\/t\/p\/w500\/([A-Za-z0-9_./-]+)"/)?.[1] ||
    html.match(/media\.themoviedb\.org\/t\/p\/w500_and_h750_bestv2\/([A-Za-z0-9_./-]+)/)?.[1] ||
    html.match(/media\.themoviedb\.org\/t\/p\/w342_and_h513_bestv2\/([A-Za-z0-9_./-]+)/)?.[1] ||
    null
  const backdrop = html.match(/media\.themoviedb\.org\/t\/p\/w1920_and_h800_multi_faces\/([A-Za-z0-9_./-]+)/)?.[1] || null
  return { poster, backdrop }
}

// Explicit mappings for entries that fuzzy matching cannot resolve reliably.
// Duplicate/season entries reuse the parent show's artwork.
const ID_OVERRIDES = {
  w: { media: 'tv', id: '66330' },
  goblin: { media: 'tv', id: '67915' },
  black: { media: 'tv', id: '73944' },
  'penthouse-war-in-life': { media: 'tv', id: '99489' },
  tyrant: { media: 'tv', id: '246748' },
  'come-hug-me': { media: 'tv', id: '79238' },
  'joseon-psychiatrist': { media: 'tv', id: '139289' },
  'will-it-snow-for-christmas-2': { media: 'tv', id: '31931' },
  'daljas-spring-2': { media: 'tv', id: '1390' },
  'love-ft-marriage-and-divorce-2': { media: 'tv', id: '116041' },
  'the-queen-of-the-office': { media: 'tv', id: '78163' },
  'stranger-from-hell': { media: 'tv', id: '89959' },
  'the-uncanny-counter-season-2': { media: 'tv', id: '113268' },
  'kingdom-season-2': { media: 'tv', id: '70593' },
  'love-alarm-season-2': { media: 'tv', id: '89641' },
  'age-of-youth-2': { media: 'tv', id: '67014' },
  'hospital-playlist-season-2': { media: 'tv', id: '96102' },
  'welcome-to-waikiki-season-2': { media: 'tv', id: '76557' },
  'a-shop-for-killers-season-2': { media: 'tv', id: '215072' },
  'sweet-home-season-2': { media: 'tv', id: '96648' },
  'the-glory': { media: 'tv', id: '136283' },
  'the-glory-part-2': { media: 'tv', id: '136283' },
  'the-princess-man': { media: 'tv', id: '40239' },
  'padam-padam': { media: 'tv', id: '42290' },
  kairos: { media: 'tv', id: '112119' },
  'the-banker': { media: 'tv', id: '87409' },
  'beautiful-days': { media: 'tv', id: '14175' },
  'squid-game-season-2': { media: 'tv', id: '93405' },
  'squid-game-season-3': { media: 'tv', id: '93405' },
  'weak-hero-class-2': { media: 'tv', id: '200709' },
}

const kdramas = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'kdramas.json'), 'utf8'))

// Titles that have no reliable presence anywhere (fabricated catalog entries)
// — force null so the generated artwork shows instead of a wrong movie poster.
const NULL_SLUGS = new Set((process.env.NULL_SLUGS || '').split(',').map((s) => s.trim()).filter(Boolean))
const ONLY = new Set((process.env.ONLY || '').split(',').map((s) => s.trim()).filter(Boolean))
const subset = kdramas.filter((k) => ONLY.size === 0 || ONLY.has(k.slug))

// When running a subset (ONLY=...), preserve existing entries not reprocessed.
const results = fs.existsSync(OUT) && ONLY.size ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {}
let ok = 0
let unmatched = []

for (let i = 0; i < subset.length; i++) {
  const { slug, title, year } = subset[i]
  try {
    let card = null
    if (NULL_SLUGS.has(slug)) {
      results[slug] = null
      unmatched.push(slug)
      console.log(`${slug} | ${title} (${year}): NULLED`)
      continue
    }
    if (ID_OVERRIDES[slug]) {
      card = { media: ID_OVERRIDES[slug].media, id: ID_OVERRIDES[slug].id }
    } else {
      const html = await get(`https://www.themoviedb.org/search?query=${encodeURIComponent(title)}`)
      card = pickBest(parseCards(html), title, year)
    }

    if (!card) {
      results[slug] = null
      unmatched.push(slug)
      console.log(`${slug} | ${title} (${year}): NO MATCH`)
      await delay(450)
      continue
    }

    const [art] = await Promise.all([findArt(card.id, card.media)])
    const poster = art.poster || card.poster
    if (!poster) {
      results[slug] = null
      unmatched.push(slug)
      console.log(`${slug} | ${title} (${year}): NO POSTER ART (${card.media}/${card.id})`)
      await delay(450)
      continue
    }
    results[slug] = {
      poster: posterBase + '/' + poster,
      banner: art.backdrop ? bannerBase + '/' + art.backdrop : null,
      tmdbId: card.id,
      media: card.media,
    }
    ok++
    console.log(`${slug} | ${title} (${year}) -> /${card.media}/${card.id} ${art.backdrop ? 'BACKDROP OK' : 'no backdrop'}`)
  } catch (e) {
    console.error(`${slug} | ${title} (${year}): FAILED ${e.message}`)
    results[slug] = null
    unmatched.push(slug)
  }

  if ((i + 1) % 25 === 0) {
    fs.writeFileSync(OUT, JSON.stringify(results, null, 2))
    console.log(`...progress ${i + 1}/${kdramas.length}`)
  }
  await delay(450)
}

fs.writeFileSync(OUT, JSON.stringify(results, null, 2))
console.log(`\nWrote src/lib/kdrama-posters.json | matched: ${ok} | unmatched: ${unmatched.length}`)
if (unmatched.length) console.log('UNMATCHED:', unmatched.join(', '))