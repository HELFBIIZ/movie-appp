import fs from 'fs';
import path from 'path';

const DIR = path.join(process.cwd(), 'data', 'subtitles');
const MANIFEST = path.join(DIR, 'manifest.json');

function ensure() {
  fs.mkdirSync(DIR, { recursive: true });
}

function readManifest() {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  } catch {
    return {};
  }
}

function writeManifest(manifest) {
  ensure();
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
}

export function saveGenerated(slug, content, meta = {}) {
  ensure();
  const file = `${slug}.vtt`;
  fs.writeFileSync(path.join(DIR, file), content);
  const manifest = readManifest();
  manifest[slug] = { file, ...meta, updatedAt: Date.now() };
  writeManifest(manifest);
}

export function getGenerated(slug) {
  const manifest = readManifest();
  let alias;
  try {
    alias = JSON.parse(fs.readFileSync(path.join(DIR, 'aliases.json'), 'utf8'))[slug];
  } catch {
    /* Older stores have no aliases. */
  }
  const entry = Object.hasOwn(manifest, slug)
    ? manifest[slug]
    : typeof alias === 'string' && Object.hasOwn(manifest, alias)
      ? manifest[alias]
      : null;
  if (!entry || typeof entry.file !== 'string') return null;
  const file = path.resolve(DIR, entry.file);
  if (!file.startsWith(path.resolve(DIR) + path.sep)) return null;
  if (!fs.existsSync(file)) return null;
  return {
    content: fs.readFileSync(file, 'utf8'),
    meta: alias ? { ...entry, aliasOf: alias } : entry,
  };
}

export function getManifest() {
  return readManifest();
}
