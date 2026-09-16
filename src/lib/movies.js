import tmdbArt from './posters.json'
import kdramaArt from './kdrama-posters.json'
import fetchedCatalog from './movies.generated.json'
import kdramaCatalog from './kdramas.json'
import westernCatalog from './western.json'

const toDataUri = (svg) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

const palettes = [
  { bg1: '#7c3aed', bg2: '#2563eb', accent: '#a78bfa' },
  { bg1: '#dc2626', bg2: '#f97316', accent: '#fbbf24' },
  { bg1: '#059669', bg2: '#0891b2', accent: '#34d399' },
  { bg1: '#7c3aed', bg2: '#db2777', accent: '#f472b6' },
  { bg1: '#0f172a', bg2: '#1e40af', accent: '#60a5fa' },
  { bg1: '#1e1b4b', bg2: '#4338ca', accent: '#818cf8' },
  { bg1: '#064e3b', bg2: '#047857', accent: '#34d399' },
  { bg1: '#1c1917', bg2: '#7c2d12', accent: '#fb923c' },
];

const createMovieArt = (title, subtitle = 'Movie') => {
  const safeTitle = title
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  const safeSubtitle = subtitle
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

  const hash = title.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const palette = palettes[hash % palettes.length];
  const x1 = 150 + (hash * 7) % 500, y1 = 100 + (hash * 13) % 300, r1 = 80 + (hash * 3) % 100;
  const x2 = 100 + (hash * 11) % 600, y2 = 700 + (hash * 5) % 400, r2 = 100 + (hash * 7) % 150;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1200" role="img" aria-label="${safeTitle}">
      <defs><linearGradient id="bg${hash}" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="${palette.bg1}"/><stop offset="55%" stop-color="${palette.bg2}"/><stop offset="100%" stop-color="#0f172a"/>
      </linearGradient></defs>
      <rect width="800" height="1200" fill="url(#bg${hash})"/>
      <rect x="48" y="48" width="704" height="1104" rx="28" fill="rgba(15,23,42,0.42)" stroke="rgba(148,163,184,0.7)"/>
      <circle cx="${x1}" cy="${y1}" r="${r1}" fill="${palette.accent}" opacity="0.15"/>
      <circle cx="${x2}" cy="${y2}" r="${r2}" fill="${palette.bg1}" opacity="0.12"/>
      <text x="400" y="490" text-anchor="middle" font-size="76" font-weight="700" fill="#f8fafc" font-family="Arial, Helvetica, sans-serif">${safeTitle}</text>
      <text x="400" y="600" text-anchor="middle" font-size="30" letter-spacing="6" fill="#cbd5e1" font-family="Arial, Helvetica, sans-serif">${safeSubtitle}</text>
      <rect x="190" y="665" width="420" height="4" fill="${palette.accent}" opacity="0.9"/>
      <text x="400" y="760" text-anchor="middle" font-size="26" fill="#e2e8f0" font-family="Arial, Helvetica, sans-serif">VXNTA</text>
    </svg>`;
  return toDataUri(svg);
};

const buildPosterAsset = (movie) => createMovieArt(movie.title, movie.category.toUpperCase());
const buildBannerAsset = (movie) => createMovieArt(movie.title, movie.year.toString());

const makePosterUrl = (title) => createMovieArt(title, 'MOVIE');
const makeBannerUrl = (title) => createMovieArt(title, 'NOW PLAYING');

// Merge fetched catalog with fallback local movies, using fetched as primary
const fetchedMoviesWithPosters = (fetchedCatalog.movies || []).map(m => ({
  ...m,
  poster: m.poster || buildPosterAsset(m),
  banner: m.banner || buildBannerAsset(m),
}));

const popularFallbackMovies = [
  {
    slug: 'spider-man-brand-new-day',
    title: 'Spider-Man: Brand New Day',
    year: 2025,
    rating: 7.5,
    genres: ['Action', 'Adventure', 'Sci-Fi'],
    runtime: '2h 18m',
    language: 'English',
    director: 'Destin Daniel Cretton',
    cast: ['Tom Holland', 'Zendaya', 'Jacob Batalon'],
    plot: 'Peter Parker faces a new chapter of heroism as old enemies return, new allies emerge, and his life is forced to balance between responsibility, heart, and destiny.',
    trailerYouTubeId: '8Qn_spdMlt4',
    category: 'upcoming'
  },
  {
    slug: 'dear-santa',
    title: 'Dear Santa',
    year: 2024,
    rating: 6.9,
    genres: ['Comedy', 'Family'],
    runtime: '1h 45m',
    language: 'English',
    director: 'Peter Swift',
    cast: ['Jack Black', 'Emma Stone', 'John Cena'],
    plot: 'A determined young boy writes to Santa and discovers that the holiday magic is closer than he thinks when a surprise adventure sends him across the snowy town on a mission to save Christmas.',
    trailerYouTubeId: 'aqz-KE-bpKQ',
    category: 'upcoming'
  },
  {
    slug: 'how-to-train-your-dragon',
    title: 'How to Train Your Dragon',
    year: 2025,
    rating: 8.1,
    genres: ['Adventure', 'Fantasy'],
    runtime: '2h 5m',
    language: 'English',
    director: 'Dean DeBlois',
    cast: ['Mason Thames', 'Nico Parker', 'Gerard Butler'],
    plot: 'A young Viking discovers a deep bond with a dragon and learns that courage and friendship can reshape the fate of his tribe.',
    trailerYouTubeId: 'oKiYuIsPxYtM',
    category: 'upcoming'
  },
  {
    slug: 'alien-romulus',
    title: 'Alien Romulus',
    year: 2024,
    rating: 7.4,
    genres: ['Sci-Fi', 'Horror'],
    runtime: '1h 57m',
    language: 'English',
    director: 'Fede Álvarez',
    cast: ['Cailee Spaeny', 'David Jonsson', 'Archie Renaux'],
    plot: 'A group of space colonists stumbles into a deadly threat when they uncover a terrifying secret beneath their industrial world.',
    trailerYouTubeId: 'CGQh7qV8JWQ',
    category: 'upcoming'
  },
  {
    slug: 'the-matrix',
    title: 'The Matrix',
    year: 1999,
    rating: 8.7,
    genres: ['Action', 'Sci-Fi'],
    runtime: '2h 16m',
    language: 'English',
    director: 'The Wachowskis',
    cast: ['Keanu Reeves', 'Laurence Fishburne', 'Carrie-Anne Moss'],
    plot: 'A hacker discovers reality is a simulated illusion and joins a rebellion against machines that rule humanity.',
    trailerYouTubeId: 'vKQi3bBA1y8',
    category: 'top-rated'
  },
  {
    slug: 'inception',
    title: 'Inception',
    year: 2010,
    rating: 8.8,
    genres: ['Action', 'Sci-Fi', 'Thriller'],
    runtime: '2h 28m',
    language: 'English',
    director: 'Christopher Nolan',
    cast: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page'],
    plot: 'A thief who steals secrets from dreams is tasked with planting an idea into the mind of a target.',
    trailerYouTubeId: '8hP9D6kZseM',
    category: 'top-rated'
  },
  {
    slug: 'interstellar',
    title: 'Interstellar',
    year: 2014,
    rating: 8.7,
    genres: ['Adventure', 'Drama', 'Sci-Fi'],
    runtime: '2h 49m',
    language: 'English',
    director: 'Christopher Nolan',
    cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain'],
    plot: 'A team of explorers leaves Earth to find a new world as humanity faces extinction.',
    trailerYouTubeId: 'zSWdZVtXT7E',
    category: 'top-rated'
  },
  {
    slug: 'pulp-fiction',
    title: 'Pulp Fiction',
    year: 1994,
    rating: 8.9,
    genres: ['Crime', 'Drama'],
    runtime: '2h 34m',
    language: 'English',
    director: 'Quentin Tarantino',
    cast: ['John Travolta', 'Uma Thurman', 'Samuel L. Jackson'],
    plot: 'The lives of gangsters, hitmen, and a boxer collide in a nonlinear story of violence and redemption.',
    trailerYouTubeId: 's7EdQ4FqbhY',
    category: 'top-rated'
  },
  {
    slug: 'fight-club',
    title: 'Fight Club',
    year: 1999,
    rating: 8.8,
    genres: ['Drama', 'Thriller'],
    runtime: '2h 19m',
    language: 'English',
    director: 'David Fincher',
    cast: ['Brad Pitt', 'Edward Norton', 'Helena Bonham Carter'],
    plot: 'An insomniac office worker starts an underground fight club that evolves into something far more dangerous.',
    trailerYouTubeId: 'BdJKm16Co6M',
    category: 'top-rated'
  },
  {
    slug: 'the-dark-knight',
    title: 'The Dark Knight',
    year: 2008,
    rating: 9.0,
    genres: ['Action', 'Crime', 'Drama'],
    runtime: '2h 32m',
    language: 'English',
    director: 'Christopher Nolan',
    cast: ['Christian Bale', 'Heath Ledger', 'Aaron Eckhart'],
    plot: 'Batman faces the Joker, a criminal mastermind who turns chaos into a weapon against Gotham.',
    trailerYouTubeId: 'EXeTwQWrcwY',
    category: 'top-rated'
  },
  {
    slug: 'the-godfather',
    title: 'The Godfather',
    year: 1972,
    rating: 9.2,
    genres: ['Crime', 'Drama'],
    runtime: '2h 55m',
    language: 'English',
    director: 'Francis Ford Coppola',
    cast: ['Marlon Brando', 'Al Pacino', 'James Caan'],
    plot: 'The aging patriarch of an organized crime dynasty transfers power to his reluctant son.',
    trailerYouTubeId: 'UaVTIH8mujA',
    category: 'top-rated'
  },
  {
    slug: 'shawshank-redemption',
    title: 'The Shawshank Redemption',
    year: 1994,
    rating: 9.3,
    genres: ['Drama'],
    runtime: '2h 22m',
    language: 'English',
    director: 'Frank Darabont',
    cast: ['Tim Robbins', 'Morgan Freeman', 'Bob Gunton'],
    plot: 'A banker convicted of murder forms an unlikely friendship with a prison contraband smuggler.',
    trailerYouTubeId: '6hB3S9bIaco',
    category: 'top-rated'
  },
  {
    slug: 'forrest-gump',
    title: 'Forrest Gump',
    year: 1994,
    rating: 8.8,
    genres: ['Drama', 'Romance'],
    runtime: '2h 22m',
    language: 'English',
    director: 'Robert Zemeckis',
    cast: ['Tom Hanks', 'Robin Wright', 'Gary Sinise'],
    plot: 'A gentle man with a remarkable life journey becomes witness to major events in American history.',
    trailerYouTubeId: 'bLvqoHBptjg',
    category: 'top-rated'
  },
  {
    slug: 'gladiator',
    title: 'Gladiator',
    year: 2000,
    rating: 8.5,
    genres: ['Action', 'Drama'],
    runtime: '2h 35m',
    language: 'English',
    director: 'Ridley Scott',
    cast: ['Russell Crowe', 'Joaquin Phoenix', 'Connie Nielsen'],
    plot: 'A betrayed Roman general fights for revenge and honor in the arena of ancient Rome.',
    trailerYouTubeId: 'owK1qxDselE',
    category: 'top-rated'
  },
  {
    slug: 'seven',
    title: 'Se7en',
    year: 1995,
    rating: 8.6,
    genres: ['Crime', 'Drama', 'Thriller'],
    runtime: '2h 7m',
    language: 'English',
    director: 'David Fincher',
    cast: ['Brad Pitt', 'Morgan Freeman', 'Gwyneth Paltrow'],
    plot: 'Two detectives pursue a serial killer who stages murders around the seven deadly sins.',
    trailerYouTubeId: 'znmZOXw7m6g',
    category: 'top-rated'
  },
  {
    slug: 'the-shining',
    title: 'The Shining',
    year: 1980,
    rating: 8.4,
    genres: ['Horror', 'Drama'],
    runtime: '2h 26m',
    language: 'English',
    director: 'Stanley Kubrick',
    cast: ['Jack Nicholson', 'Shelley Duvall', 'Danny Lloyd'],
    plot: 'A family settles into an isolated hotel where a sinister force threatens the father’s sanity.',
    trailerYouTubeId: '5Cb3ik6zP2I',
    category: 'top-rated'
  },
  {
    slug: 'avatar',
    title: 'Avatar',
    year: 2009,
    rating: 7.9,
    genres: ['Action', 'Adventure', 'Fantasy'],
    runtime: '2h 42m',
    language: 'English',
    director: 'James Cameron',
    cast: ['Sam Worthington', 'Zoe Saldana', 'Sigourney Weaver'],
    plot: 'A paraplegic marine joins a war on Pandora and becomes entangled with the native Na’vi.',
    trailerYouTubeId: '5PSNL1qE6VY',
    category: 'popular'
  },
  {
    slug: 'guardians-of-the-galaxy-vol-3',
    title: 'Guardians of the Galaxy Vol. 3',
    year: 2023,
    rating: 8.0,
    genres: ['Action', 'Adventure', 'Sci-Fi'],
    runtime: '2h 30m',
    language: 'English',
    director: 'James Gunn',
    cast: ['Chris Pratt', 'Zoe Saldaña', 'Dave Bautista'],
    plot: 'The Guardians face emotional sacrifice and a final mission that could change their lives forever.',
    trailerYouTubeId: 'AAE5VZkX_2o',
    category: 'popular'
  },
  {
    slug: 'final-signal',
    title: 'Final Signal',
    year: 2026,
    rating: 7.8,
    genres: ['Sci-Fi', 'Action'],
    runtime: '2h 01m',
    language: 'English',
    director: 'N. Foster',
    cast: ['Ari Miles', 'Sasha Cole', 'Milo Grant'],
    plot: 'A final transmission reveals a secret network controlling the fate of every space mission.',
    trailerYouTubeId: 'jTQ7tK9YvSo',
    category: 'upcoming'
  },
  {
    slug: 'specter-harbor',
    title: 'Specter Harbor',
    year: 2026,
    rating: 7.5,
    genres: ['Thriller', 'Mystery'],
    runtime: '1h 56m',
    language: 'English',
    director: 'R. Doyle',
    cast: ['Nia Brooks', 'Owen Vale', 'Lena Hart'],
    plot: 'A haunted port town hides a conspiracy beneath its foggy docks and abandoned piers.',
    trailerYouTubeId: 'mQ1YhxPZr0Q',
    category: 'upcoming'
  },
  {
    slug: 'stormline',
    title: 'Stormline',
    year: 2026,
    rating: 7.4,
    genres: ['Action', 'Drama'],
    runtime: '2h 05m',
    language: 'English',
    director: 'A. Price',
    cast: ['Mila Frost', 'Theo Reeves', 'Nina West'],
    plot: 'A storm chaser discovers a pattern that points to a weaponized weather event threatening the coast.',
    trailerYouTubeId: '9hVL6PR_FWs',
    category: 'upcoming'
  },
  {
    slug: 'atlas-below',
    title: 'Atlas Below',
    year: 2026,
    rating: 7.7,
    genres: ['Adventure', 'Sci-Fi'],
    runtime: '2h 04m',
    language: 'English',
    director: 'R. Hale',
    cast: ['Jess Vale', 'Milo Hart', 'Nia Cross'],
    plot: 'A team racing below the crust of a dead planet discovers a civilization still hidden in the dark.',
    trailerYouTubeId: 'Lx2nP8CGh2M',
    category: 'upcoming'
  },
  {
    slug: 'aurora-drift',
    title: 'Aurora Drift',
    year: 2026,
    rating: 7.5,
    genres: ['Sci-Fi', 'Adventure'],
    runtime: '2h 03m',
    language: 'English',
    director: 'H. Monroe',
    cast: ['Tara Ridge', 'Milo North', 'Ari Vale'],
    plot: 'A scientific expedition drifts through the polar lights while a mysterious signal follows them home.',
    trailerYouTubeId: 'Cfu8fNVFrZ0',
    category: 'upcoming'
  },
  {
    slug: 'dune-part-two',
    title: 'Dune: Part Two',
    year: 2024,
    rating: 8.6,
    genres: ['Action', 'Adventure', 'Sci-Fi'],
    runtime: '2h 46m',
    language: 'English',
    director: 'Denis Villeneuve',
    cast: ['Timothée Chalamet', 'Zendaya', 'Rebecca Ferguson'],
    plot: 'Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family.',
    trailerYouTubeId: 'Way9Dexny3w',
    category: 'popular'
  },
  {
    slug: 'oppenheimer',
    title: 'Oppenheimer',
    year: 2023,
    rating: 8.4,
    genres: ['Biography', 'Drama', 'History'],
    runtime: '3h 0m',
    language: 'English',
    director: 'Christopher Nolan',
    cast: ['Cillian Murphy', 'Emily Blunt', 'Matt Damon'],
    plot: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.',
    trailerYouTubeId: 'uYPbbksJxIg',
    category: 'top-rated'
  },
  {
    slug: 'the-batman',
    title: 'The Batman',
    year: 2022,
    rating: 7.8,
    genres: ['Action', 'Crime', 'Drama'],
    runtime: '2h 56m',
    language: 'English',
    director: 'Matt Reeves',
    cast: ['Robert Pattinson', 'Zoë Kravitz', 'Jeffrey Wright'],
    plot: 'When a sadistic serial killer begins murdering key political figures in Gotham, Batman is forced to investigate the city\'s hidden corruption and question his family\'s involvement.',
    trailerYouTubeId: 'mqqft2x_Aa4',
    category: 'popular'
  },
  {
    slug: 'spiderman-across-the-spiderverse',
    title: 'Spider-Man: Across the Spider-Verse',
    year: 2023,
    rating: 8.6,
    genres: ['Animation', 'Action', 'Adventure'],
    runtime: '2h 20m',
    language: 'English',
    director: 'Joaquim Dos Santos',
    cast: ['Shameik Moore', 'Hailee Steinfeld', 'Oscar Isaac'],
    plot: 'Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence.',
    trailerYouTubeId: 'shW9i6k8cB0',
    category: 'top-rated'
  },
  {
    slug: 'everything-everywhere-all-at-once',
    title: 'Everything Everywhere All at Once',
    year: 2022,
    rating: 7.8,
    genres: ['Action', 'Adventure', 'Comedy'],
    runtime: '2h 19m',
    language: 'English',
    director: 'Daniel Kwan',
    cast: ['Michelle Yeoh', 'Stephanie Hsu', 'Ke Huy Quan'],
    plot: 'A middle-aged Chinese immigrant is swept up into an insane adventure in which she alone can save existence by exploring other universes and connecting with the lives she could have led.',
    trailerYouTubeId: 'wxN1T1uxQ2g',
    category: 'top-rated'
  },
  {
    slug: 'the-whale',
    title: 'The Whale',
    year: 2022,
    rating: 7.7,
    genres: ['Drama'],
    runtime: '1h 57m',
    language: 'English',
    director: 'Darren Aronofsky',
    cast: ['Brendan Fraser', 'Sadie Sink', 'Ty Simpkins'],
    plot: 'A reclusive English teacher attempts to reconnect with his estranged teenage daughter.',
    trailerYouTubeId: 'nDiot6slSms',
    category: 'popular'
  },
  {
    slug: 'top-gun-maverick',
    title: 'Top Gun: Maverick',
    year: 2022,
    rating: 8.3,
    genres: ['Action', 'Drama'],
    runtime: '2h 10m',
    language: 'English',
    director: 'Joseph Kosinski',
    cast: ['Tom Cruise', 'Miles Teller', 'Jennifer Connelly'],
    plot: 'After thirty years, Maverick is still pushing the envelope as a top naval aviator, but must confront ghosts of his past when he leads TOP GUN\'s elite graduates on a mission that demands the ultimate sacrifice.',
    trailerYouTubeId: 'giXco2jaZ_4',
    category: 'popular'
  },
  {
    slug: 'parasite',
    title: 'Parasite',
    year: 2019,
    rating: 8.5,
    genres: ['Comedy', 'Drama', 'Thriller'],
    runtime: '2h 12m',
    language: 'Korean',
    director: 'Bong Joon Ho',
    cast: ['Song Kang-ho', 'Lee Sun-kyun', 'Cho Yeo-jeong'],
    plot: 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.',
    trailerYouTubeId: '5xH0HfJHsaY',
    category: 'top-rated'
  },
  {
    slug: 'joker',
    title: 'Joker',
    year: 2019,
    rating: 8.4,
    genres: ['Crime', 'Drama', 'Thriller'],
    runtime: '2h 2m',
    language: 'English',
    director: 'Todd Phillips',
    cast: ['Joaquin Phoenix', 'Robert De Niro', 'Zazie Beetz'],
    plot: 'During the 1980s, a failed stand-up comedian is driven insane and turns to a life of crime and chaos in Gotham City while becoming an infamous psychopathic crime figure.',
    trailerYouTubeId: 'zAGVQLHvwOY',
    category: 'popular'
  },
  {
    slug: 'the-wolf-of-wall-street',
    title: 'The Wolf of Wall Street',
    year: 2013,
    rating: 8.2,
    genres: ['Biography', 'Comedy', 'Crime'],
    runtime: '3h 0m',
    language: 'English',
    director: 'Martin Scorsese',
    cast: ['Leonardo DiCaprio', 'Jonah Hill', 'Margot Robbie'],
    plot: 'Based on the true story of Jordan Belfort, from his rise to a wealthy stock-broker living the high life to his fall involving crime, corruption and the federal government.',
    trailerYouTubeId: 'iszwuX1AK6A',
    category: 'popular'
  },
  {
    slug: 'mad-max-fury-road',
    title: 'Mad Max: Fury Road',
    year: 2015,
    rating: 8.1,
    genres: ['Action', 'Adventure', 'Sci-Fi'],
    runtime: '2h 0m',
    language: 'English',
    director: 'George Miller',
    cast: ['Tom Hardy', 'Charlize Theron', 'Nicholas Hoult'],
    plot: 'In a post-apocalyptic wasteland, a woman rebels against a tyrannical ruler in search for her homeland with the help of a group of female prisoners, a psychotic worshiper, and a drifter named Max.',
    trailerYouTubeId: 'hEJnMQG9ev8',
    category: 'top-rated'
  },
  {
    slug: 'blade-runner-2049',
    title: 'Blade Runner 2049',
    year: 2017,
    rating: 8.0,
    genres: ['Action', 'Drama', 'Mystery'],
    runtime: '2h 44m',
    language: 'English',
    director: 'Denis Villeneuve',
    cast: ['Ryan Gosling', 'Harrison Ford', 'Ana de Armas'],
    plot: 'Young Blade Runner K\'s discovery of a long-buried secret leads him to track down former Blade Runner Rick Deckard, who\'s been missing for thirty years.',
    trailerYouTubeId: 'gCcx85zWz6U',
    category: 'top-rated'
  },
  {
    slug: 'whiplash',
    title: 'Whiplash',
    year: 2014,
    rating: 8.5,
    genres: ['Drama', 'Music'],
    runtime: '1h 46m',
    language: 'English',
    director: 'Damien Chazelle',
    cast: ['Miles Teller', 'J.K. Simmons', 'Melissa Benoist'],
    plot: 'A promising young drummer enrolls at a cut-throat music conservatory where his dreams of greatness are mentored by an instructor who will stop at nothing to realize a student\'s potential.',
    trailerYouTubeId: '7d_jQC6Wpwc',
    category: 'top-rated'
  },
  {
    slug: 'the-prestige',
    title: 'The Prestige',
    year: 2006,
    rating: 8.5,
    genres: ['Drama', 'Mystery', 'Sci-Fi'],
    runtime: '2h 10m',
    language: 'English',
    director: 'Christopher Nolan',
    cast: ['Christian Bale', 'Hugh Jackman', 'Scarlett Johansson'],
    plot: 'After a tragic accident, two stage magicians in 1890s London engage in a battle to create the ultimate illusion while sacrificing everything they have to outwit each other.',
    trailerYouTubeId: 'o4gHCmTQDVI',
    category: 'top-rated'
  },
  {
    slug: 'shutter-island',
    title: 'Shutter Island',
    year: 2010,
    rating: 8.2,
    genres: ['Mystery', 'Thriller'],
    runtime: '2h 18m',
    language: 'English',
    director: 'Martin Scorsese',
    cast: ['Leonardo DiCaprio', 'Emily Mortimer', 'Mark Ruffalo'],
    plot: 'In 1954, a U.S. Marshal investigates the disappearance of a murderer who escaped from a hospital for the criminally insane.',
    trailerYouTubeId: '5iaYLCiq5RM',
    category: 'popular'
  },
  {
    slug: 'the-departed',
    title: 'The Departed',
    year: 2006,
    rating: 8.5,
    genres: ['Crime', 'Drama', 'Thriller'],
    runtime: '2h 31m',
    language: 'English',
    director: 'Martin Scorsese',
    cast: ['Leonardo DiCaprio', 'Matt Damon', 'Jack Nicholson'],
    plot: 'An undercover cop and a mole in the police force attempt to identify each other while infiltrating an Irish gang in South Boston.',
    trailerYouTubeId: 'iojhqm0JTW4',
    category: 'top-rated'
  },
  {
    slug: 'coco',
    title: 'Coco',
    year: 2017,
    rating: 8.4,
    genres: ['Animation', 'Adventure', 'Comedy'],
    runtime: '1h 45m',
    language: 'English',
    director: 'Lee Unkrich',
    cast: ['Anthony Gonzalez', 'Gael García Bernal', 'Benjamin Bratt'],
    plot: 'Aspiring musician Miguel, confronted with his family\'s ancestral ban on music, enters the Land of the Dead to find his great-great-grandfather, a legendary singer.',
    trailerYouTubeId: 'xlnPHQ75OT8',
    category: 'top-rated'
  },
  {
    slug: 'spirited-away',
    title: 'Spirited Away',
    year: 2001,
    rating: 8.6,
    genres: ['Animation', 'Adventure', 'Family'],
    runtime: '2h 5m',
    language: 'Japanese',
    director: 'Hayao Miyazaki',
    cast: ['Daveigh Chase', 'Suzanne Pleshette', 'Miyu Irino'],
    plot: 'During her family\'s move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits, and where humans are changed into beasts.',
    trailerYouTubeId: 'ByXuk9QqQkk',
    category: 'top-rated'
  },
  {
    slug: 'the-lion-king',
    title: 'The Lion King',
    year: 1994,
    rating: 8.5,
    genres: ['Animation', 'Adventure', 'Drama'],
    runtime: '1h 28m',
    language: 'English',
    director: 'Roger Allers',
    cast: ['Matthew Broderick', 'Jeremy Irons', 'James Earl Jones'],
    plot: 'Lion prince Simba and his father are targeted by his bitter uncle, who wants to ascend the throne himself.',
    trailerYouTubeId: '4sj1MT05lAA',
    category: 'top-rated'
  },
  {
    slug: 'goodfellas',
    title: 'Goodfellas',
    year: 1990,
    rating: 8.7,
    genres: ['Crime', 'Drama'],
    runtime: '2h 26m',
    language: 'English',
    director: 'Martin Scorsese',
    cast: ['Robert De Niro', 'Ray Liotta', 'Joe Pesci'],
    plot: 'The story of Henry Hill and his life in the mob, covering his relationship with his wife Karen Hill and his mob partners.',
    trailerYouTubeId: 'qo5jJpHtI1Y',
    category: 'top-rated'
  },
  {
    slug: 'sopranos-family-dinner',
    title: 'Family Dinner',
    year: 2024,
    rating: 7.6,
    genres: ['Drama', 'Comedy'],
    runtime: '1h 58m',
    language: 'English',
    director: 'Sarah Chen',
    cast: ['Viola Davis', 'Oscar Isaac', 'Awkwafina'],
    plot: 'Three generations of a Chinese-American family collide during a seemingly simple holiday dinner.',
    trailerYouTubeId: 'dQw4w9WgXcQ',
    category: 'popular'
  },
  {
    slug: 'the-grand-budapest-hotel',
    title: 'The Grand Budapest Hotel',
    year: 2014,
    rating: 8.1,
    genres: ['Adventure', 'Comedy', 'Crime'],
    runtime: '1h 39m',
    language: 'English',
    director: 'Wes Anderson',
    cast: ['Ralph Fiennes', 'Tony Revolori', 'Saoirse Ronan'],
    plot: 'A writer encounters the owner of an aging high-class hotel, who tells of his early years as a lobby boy.',
    trailerYouTubeId: '1Fg5iWmQjwk',
    category: 'top-rated'
  },
  {
    slug: 'eternal-sunshine',
    title: 'Eternal Sunshine of the Spotless Mind',
    year: 2004,
    rating: 8.3,
    genres: ['Drama', 'Romance', 'Sci-Fi'],
    runtime: '1h 48m',
    language: 'English',
    director: 'Michel Gondry',
    cast: ['Jim Carrey', 'Kate Winslet', 'Tom Wilkinson'],
    plot: 'When their relationship turns sour, someone visits a company to have their memories of each other erased.',
    trailerYouTubeId: 'rbDyELrRvHY',
    category: 'top-rated'
  },
  {
    slug: 'get-out',
    title: 'Get Out',
    year: 2017,
    rating: 7.7,
    genres: ['Horror', 'Mystery', 'Thriller'],
    runtime: '1h 44m',
    language: 'English',
    director: 'Jordan Peele',
    cast: ['Daniel Kaluuya', 'Allison Williams', 'Bradley Whitford'],
    plot: 'A young African-American man visits his white girlfriend\'s family estate for the weekend, where a simmering tension reveals disturbing truths.',
    trailerYouTubeId: 'DzfpyUB60YY',
    category: 'popular'
  },
  {
    slug: 'a-quiet-place',
    title: 'A Quiet Place',
    year: 2018,
    rating: 7.5,
    genres: ['Drama', 'Horror', 'Sci-Fi'],
    runtime: '1h 30m',
    language: 'English',
    director: 'John Krasinski',
    cast: ['Emily Blunt', 'John Krasinski', 'Millicent Simmonds'],
    plot: 'A family struggles for survival in a post-apocalyptic world filled with blind aliens with ultra-sensitive hearing.',
    trailerYouTubeId: 'WR7cc5t7tv8',
    category: 'popular'
  },
  {
    slug: 'arrival',
    title: 'Arrival',
    year: 2016,
    rating: 7.9,
    genres: ['Drama', 'Mystery', 'Sci-Fi'],
    runtime: '1h 56m',
    language: 'English',
    director: 'Denis Villeneuve',
    cast: ['Amy Adams', 'Jeremy Renner', 'Forest Whitaker'],
    plot: 'A linguist is recruited by the military to communicate with alien lifeforms after mysterious spacecraft land around the world.',
    trailerYouTubeId: 'tFMo3UJ4Bmg',
    category: 'top-rated'
  },
  {
    slug: 'pride-and-prejudice',
    title: 'Pride & Prejudice',
    year: 2005,
    rating: 7.8,
    genres: ['Drama', 'Romance'],
    runtime: '2h 9m',
    language: 'English',
    director: 'Joe Wright',
    cast: ['Keira Knightley', 'Matthew Macfadyen', 'Brendan Coyle'],
    plot: 'Sparks fly when fiery Elizabeth Bennet meets the handsome but haughty Mr. Darcy.',
    trailerYouTubeId: '1MKsVmD5GMA',
    category: 'popular'
  },
  {
    slug: 'la-la-land',
    title: 'La La Land',
    year: 2016,
    rating: 8.0,
    genres: ['Comedy', 'Drama', 'Music', 'Romance'],
    runtime: '2h 8m',
    language: 'English',
    director: 'Damien Chazelle',
    cast: ['Ryan Gosling', 'Emma Stone', 'Rosemarie DeWitt'],
    plot: 'While navigating their careers in Los Angeles, a pianist and an actress fall in love while attempting to reconcile their aspirations.',
    trailerYouTubeId: '0pdqf4P9MB8',
    category: 'popular'
  },
  {
    slug: 'rocky',
    title: 'Rocky',
    year: 1976,
    rating: 8.1,
    genres: ['Drama', 'Sport'],
    runtime: '2h 0m',
    language: 'English',
    director: 'John G. Avildsen',
    cast: ['Sylvester Stallone', 'Talia Shire', 'Burt Young'],
    plot: 'A small-time boxer from Philadelphia gets a once-in-a-lifetime opportunity to fight the heavyweight champion.',
    trailerYouTubeId: 'S1cYRRf7bQQ',
    category: 'top-rated'
  },
  {
    slug: 'jump-street',
    title: '21 Jump Street',
    year: 2012,
    rating: 7.2,
    genres: ['Action', 'Comedy', 'Crime'],
    runtime: '1h 50m',
    language: 'English',
    director: 'Phil Lord',
    cast: ['Jonah Hill', 'Channing Tatum', 'Ice Cube'],
    plot: 'A mismatched pair of cops go undercover as high school students to take down a drug ring.',
    trailerYouTubeId: 'RLoKtb4c4W0',
    category: 'popular'
  },
  {
    slug: 'superbad',
    title: 'Superbad',
    year: 2007,
    rating: 7.6,
    genres: ['Comedy'],
    runtime: '1h 53m',
    language: 'English',
    director: 'Greg Mottola',
    cast: ['Jonah Hill', 'Michael Cera', 'Christopher Mintz-Plasse'],
    plot: 'Two co-dependent high school seniors are forced to deal with separation anxiety when their plan to stage a booze-soaked party goes awry.',
    trailerYouTubeId: 'Y7BMWgjvOkk',
    category: 'popular'
  },
  {
    slug: 'mean-girls',
    title: 'Mean Girls',
    year: 2004,
    rating: 7.0,
    genres: ['Comedy'],
    runtime: '1h 34m',
    language: 'English',
    director: 'Mark Waters',
    cast: ['Lindsay Lohan', 'Rachel McAdams', 'Tim Meadows'],
    plot: 'Cady Heron is a hit with The Plastics, the A-list girl clique at her new school, until she makes the mistake of falling for Aaron Samuels.',
    trailerYouTubeId: 'PikeGwDoXFg',
    category: 'popular'
  },
  {
    slug: 'the-hangover',
    title: 'The Hangover',
    year: 2009,
    rating: 7.7,
    genres: ['Comedy'],
    runtime: '1h 40m',
    language: 'English',
    director: 'Todd Phillips',
    cast: ['Bradley Cooper', 'Zach Galifianakis', 'Ed Helms'],
    plot: 'Three buddies awaken from a bachelor party in Las Vegas with no memory and must find their friend before his wedding.',
    trailerYouTubeId: 'tcdUhdOlz9M',
    category: 'popular'
  },
  {
    slug: 'saw',
    title: 'Saw',
    year: 2004,
    rating: 7.6,
    genres: ['Horror', 'Mystery', 'Thriller'],
    runtime: '1h 43m',
    language: 'English',
    director: 'James Wan',
    cast: ['Cary Elwes', 'Leigh Whannell', 'Danny Glover'],
    plot: 'Two strangers wake up chained to a toilet in a bathroom, without knowing who put them there, but receiving a series of clues through a dead man\'s voice.',
    trailerYouTubeId: 'G5HrJtM4wB8',
    category: 'popular'
  },
  {
    slug: 'the-conjuring',
    title: 'The Conjuring',
    year: 2013,
    rating: 7.5,
    genres: ['Horror', 'Mystery', 'Thriller'],
    runtime: '1h 52m',
    language: 'English',
    director: 'James Wan',
    cast: ['Vera Farmiga', 'Patrick Wilson', 'Lili Taylor'],
    plot: 'Paranormal investigators Ed and Lorraine Warren work to help a family terrorized by a dark presence in their farmhouse.',
    trailerYouTubeId: 'k10ETZ41q5o',
    category: 'popular'
  },
  {
    slug: 'jaws',
    title: 'Jaws',
    year: 1975,
    rating: 8.0,
    genres: ['Adventure', 'Mystery', 'Thriller'],
    runtime: '2h 4m',
    language: 'English',
    director: 'Steven Spielberg',
    cast: ['Roy Scheider', 'Robert Shaw', 'Richard Dreyfuss'],
    plot: 'When a killer shark unleashes chaos on a beach community, it\'s up to a local sheriff, a marine biologist, and an old seafarer to hunt the beast down.',
    trailerYouTubeId: 'U1fu-Sx0_Og',
    category: 'top-rated'
  },
  {
    slug: 'et',
    title: 'E.T. the Extra-Terrestrial',
    year: 1982,
    rating: 7.9,
    genres: ['Family', 'Sci-Fi'],
    runtime: '1h 55m',
    language: 'English',
    director: 'Steven Spielberg',
    cast: ['Henry Thomas', 'Drew Barrymore', 'Peter Coyote'],
    plot: 'A troubled child summons the courage to help a friendly alien escape Earth and return to his home world.',
    trailerYouTubeId: 'bD7bpG-zDJQ',
    category: 'top-rated'
  },
  {
    slug: 'back-to-the-future',
    title: 'Back to the Future',
    year: 1985,
    rating: 8.5,
    genres: ['Adventure', 'Comedy', 'Sci-Fi'],
    runtime: '1h 56m',
    language: 'English',
    director: 'Robert Zemeckis',
    cast: ['Michael J. Fox', 'Christopher Lloyd', 'Lea Thompson'],
    plot: 'Marty McFly, a 17-year-old high school student, is accidentally sent 30 years into the past in a time-traveling DeLorean.',
    trailerYouTubeId: 'QvHg2DWX0bI',
    category: 'top-rated'
  },
  {
    slug: 'terminator-2',
    title: 'Terminator 2: Judgment Day',
    year: 1991,
    rating: 8.6,
    genres: ['Action', 'Sci-Fi'],
    runtime: '2h 17m',
    language: 'English',
    director: 'James Cameron',
    cast: ['Arnold Schwarzenegger', 'Linda Hamilton', 'Edward Furlong'],
    plot: 'A cyborg, identical to the one who failed to kill Sarah Connor, must now protect her ten-year-old son John from a more advanced cyborg.',
    trailerYouTubeId: 'CRRlK4y8OZs',
    category: 'top-rated'
  },
  {
    slug: 'alien',
    title: 'Alien',
    year: 1979,
    rating: 8.5,
    genres: ['Horror', 'Sci-Fi'],
    runtime: '1h 57m',
    language: 'English',
    director: 'Ridley Scott',
    cast: ['Sigourney Weaver', 'Tom Skerritt', 'John Hurt'],
    plot: 'After investigating a mysterious transmission of unknown origin, the crew of a commercial spacecraft encounters a deadly lifeform.',
    trailerYouTubeId: 'Xm4gNhVV6PQ',
    category: 'top-rated'
  },
  {
    slug: '2001-a-space-odyssey',
    title: '2001: A Space Odyssey',
    year: 1968,
    rating: 8.3,
    genres: ['Adventure', 'Sci-Fi'],
    runtime: '2h 29m',
    language: 'English',
    director: 'Stanley Kubrick',
    cast: ['Keir Dullea', 'Gary Lockwood', 'William Sylvester'],
    plot: 'After uncovering a mysterious artifact buried beneath the Lunar surface, a spacecraft is sent to Jupiter with the advanced AI computer HAL 9000.',
    trailerYouTubeId: 'oR_e9y-bka0',
    category: 'top-rated'
  },
  {
    slug: 'titanic',
    title: 'Titanic',
    year: 1997,
    rating: 7.9,
    genres: ['Drama', 'Romance'],
    runtime: '3h 14m',
    language: 'English',
    director: 'James Cameron',
    cast: ['Leonardo DiCaprio', 'Kate Winslet', 'Billy Zane'],
    plot: 'A seventeen-year-old aristocrat falls in love with a kind but poor artist aboard the luxurious, ill-fated R.M.S. Titanic.',
    trailerYouTubeId: 'kVrqfYjkWUU',
    category: 'popular'
  },
  {
    slug: 'the-truman-show',
    title: 'The Truman Show',
    year: 1998,
    rating: 8.2,
    genres: ['Comedy', 'Drama', 'Sci-Fi'],
    runtime: '1h 43m',
    language: 'English',
    director: 'Peter Weir',
    cast: ['Jim Carrey', 'Ed Harris', 'Laura Linney'],
    plot: 'An insurance salesman discovers his whole life is actually a reality TV show.',
    trailerYouTubeId: 'loTIzXSS7C0',
    category: 'top-rated'
  },
  {
    slug: 'dont-breathe',
    title: "Don't Breathe",
    year: 2016,
    rating: 7.1,
    genres: ['Horror', 'Thriller'],
    runtime: '1h 42m',
    language: 'English',
    director: 'Fede Álvarez',
    cast: ['Stephen Lang', 'Jane Levy', 'Dylan Minnette'],
    plot: 'Three confident thieves think it\'s a risk-free bet to burglarize the house of a blind man, but they soon realize it\'s anything but that.',
    trailerYouTubeId: '7upxU3i6BL4',
    category: 'popular'
  },
  {
    slug: 'bird-box',
    title: 'Bird Box',
    year: 2018,
    rating: 6.6,
    genres: ['Drama', 'Horror', 'Sci-Fi', 'Thriller'],
    runtime: '2h 4m',
    language: 'English',
    director: 'Susanne Bier',
    cast: ['Sandra Bullock', 'Travis Fimmel', 'John Malkovich'],
    plot: 'Five years after a mysterious force wipes out human civilization, a mother and her two children make a desperate bid for safety.',
    trailerYouTubeId: 'o2AnhgQOKHs',
    category: 'popular'
  },
  {
    slug: 'wonder-woman',
    title: 'Wonder Woman',
    year: 2017,
    rating: 7.4,
    genres: ['Action', 'Adventure', 'Fantasy'],
    runtime: '2h 21m',
    language: 'English',
    director: 'Patty Jenkins',
    cast: ['Gal Gadot', 'Chris Pine', 'Robin Wright'],
    plot: 'When a pilot crashes and tells of conflict in the outside world, Diana, an Amazonian warrior in training, leaves home to fight a war.',
    trailerYouTubeId: '1Q8fG0TtVAY',
    category: 'popular'
  },
  {
    slug: 'black-panther',
    title: 'Black Panther',
    year: 2018,
    rating: 7.3,
    genres: ['Action', 'Adventure', 'Sci-Fi'],
    runtime: '2h 14m',
    language: 'English',
    director: 'Ryan Coogler',
    cast: ['Chadwick Boseman', 'Michael B. Jordan', 'Lupita Nyong\'o'],
    plot: 'T\'Challa, heir to the hidden but advanced kingdom of Wakanda, must step forward to lead his people into a new future.',
    trailerYouTubeId: '34PgqTOXaP4',
    category: 'popular'
  },
  {
    slug: 'avengers-endgame',
    title: 'Avengers: Endgame',
    year: 2019,
    rating: 8.4,
    genres: ['Action', 'Adventure', 'Drama'],
    runtime: '3h 1m',
    language: 'English',
    director: 'Anthony Russo',
    cast: ['Robert Downey Jr.', 'Chris Evans', 'Scarlett Johansson'],
    plot: 'After the devastating events of Infinity War, the universe is in ruins. With the help of remaining allies, the Avengers assemble once more.',
    trailerYouTubeId: 'TcMBFSGVi1c',
    category: 'popular'
  },
  {
    slug: 'parasite-burning',
    title: 'Burning',
    year: 2018,
    rating: 7.5,
    genres: ['Drama', 'Mystery', 'Thriller'],
    runtime: '2h 23m',
    language: 'Korean',
    director: 'Lee Chang-dong',
    cast: ['Yoo Ah-in', 'Steven Yeun', 'Jung Yu-mi'],
    plot: 'Jong-su encounters Hae-mi, who used to live in the same neighborhood. She asks him to look after her cat while she\'s on a trip to Africa.',
    trailerYouTubeId: '1VAuKFAgQ48',
    category: 'top-rated'
  },
  {
    slug: 'oldboy',
    title: 'Oldboy',
    year: 2003,
    rating: 8.4,
    genres: ['Action', 'Drama', 'Mystery', 'Thriller'],
    runtime: '2h 14m',
    language: 'Korean',
    director: 'Park Chan-wook',
    cast: ['Choi Min-sik', 'Yoo Ji-tae', 'Kang Hye-jung'],
    plot: 'After being imprisoned for 15 years without knowing why, a man is released and given 5 days to find his captor.',
    trailerYouTubeId: '2HkjrJ6IK5',
    category: 'top-rated'
  },
];

const curatedSlugs = new Set(popularFallbackMovies.map((movie) => movie.slug))
const generatedMovies = (fetchedCatalog.movies || [])
  .filter((movie) => movie?.slug && !curatedSlugs.has(movie.slug))
  .map((movie) => ({
    ...movie,
    poster: movie.poster || makePosterUrl(movie.title),
    banner: movie.banner || makeBannerUrl(movie.title),
    mediaType: movie.mediaType || (movie.episodes && movie.episodes > 1 ? 'tv' : 'movie'),
  }))

const kdramaCatalogMovies = (kdramaCatalog || [])
  .filter((movie) => movie?.slug)
  .map((movie) => ({
    ...movie,
    poster: kdramaArt[movie.slug]?.poster || movie.poster || makePosterUrl(movie.title),
    banner: kdramaArt[movie.slug]?.banner || movie.banner || makeBannerUrl(movie.title),
    tmdbId: kdramaArt[movie.slug]?.tmdbId || movie.tmdbId || null,
    mediaType: kdramaArt[movie.slug]?.media || movie.media || (movie.episodes && movie.episodes > 1 ? 'tv' : 'movie'),
  }))

const westernCatalogMovies = (westernCatalog || [])
  .filter((movie) => movie?.slug)
  .map((movie) => ({
    ...movie,
    poster: movie.poster || makePosterUrl(movie.title),
    banner: movie.banner || makeBannerUrl(movie.title),
    mediaType: movie.media || (movie.episodes && movie.episodes > 1 ? 'tv' : 'movie'),
  }))

export const movies = [
  ...popularFallbackMovies.map((movie) => {
    const art = tmdbArt[movie.slug];
    return {
      ...movie,
      poster: art?.poster || makePosterUrl(movie.title),
      banner: art?.banner || makeBannerUrl(movie.title),
      tmdbId: art?.tmdbId || null,
      mediaType: art?.media || movie.media || 'movie',
    };
  }),
  ...kdramaCatalogMovies,
  ...westernCatalogMovies,
  ...generatedMovies,
];

export const fallbackMovies = movies;
export const featuredMovie = movies[0];
export const upcomingMovies = movies.filter((movie) => movie.category === 'upcoming');
export const topRatedMovies = movies.filter((movie) => movie.category === 'top-rated');
export const kdramaMovies = movies.filter((movie) => movie.category === 'kdrama');
export const popularMovies = movies.filter((movie) => movie.category === 'popular');
export const westernMovies = movies.filter((movie) => movie.category === 'western');

export function getMovieBySlug(slug) {
  return movies.find((movie) => movie.slug === slug);
}

export const allGenres = Array.from(new Set(movies.flatMap((movie) => movie.genres)));

export function getMoviesByGenre(genre) {
  return movies.filter((movie) => movie.genres.includes(genre));
}

export function getRecommendations(movie, count = 6) {
  if (!movie) return movies.slice(0, count);
  const other = movies.filter(m => m.slug !== movie.slug);
  const scored = other.map(m => {
    let score = 0;
    score += m.genres.filter(g => movie.genres.includes(g)).length * 10;
    score += Math.abs(m.year - movie.year) <= 3 ? 5 : 0;
    score += Math.abs(m.rating - movie.rating) <= 1 ? 3 : 0;
    score += m.rating;
    return { movie: m, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map(s => s.movie);
}

export function getTopRecentlyAdded(count = 10) {
  const near = new Date();
  return [...movies]
    .filter(m => m.year >= near.getFullYear() - 3 && m.rating >= 6)
    .sort((a, b) => b.year - a.year || b.rating - a.rating)
    .slice(0, count);
}

export function getTrendingMovies(count = 5) {
  return [...movies]
    .filter(m => m.rating >= 7)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, count);
}
