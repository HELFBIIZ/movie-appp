import fs from 'fs'
const gen = JSON.parse(fs.readFileSync('src/lib/movies.generated.json', 'utf8'))
const list = Array.isArray(gen) ? gen : gen.movies || []
const noPoster = list.filter((m) => !m.poster)
console.log('generated missing poster:', noPoster.length, '/', list.length)
console.log(noPoster.slice(0, 30).map((m) => m.slug).join('\n'))
const w = JSON.parse(fs.readFileSync('src/lib/western.json', 'utf8'))
console.log('western missing poster:', w.filter((x) => !x.poster).length, '/', w.length)
const kd = JSON.parse(fs.readFileSync('src/lib/kdramas.json', 'utf8'))
const kp = JSON.parse(fs.readFileSync('src/lib/kdrama-posters.json', 'utf8'))
const kdMissing = kd.filter((x) => !kp[x.slug]?.poster)
console.log('kdrama missing poster:', kdMissing.length, '/', kd.length)
console.log(kdMissing.slice(0, 40).map((x) => `${x.slug} | ${x.title} | tmdb:${kp[x.slug]?.tmdbId ?? 'none'}`).join('\n'))
