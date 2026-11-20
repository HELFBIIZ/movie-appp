const store = new Map()

export function setTranslatedSubtitle(id, content) {
  store.set(id, { content, createdAt: Date.now() })
}

export function getTranslatedSubtitle(id) {
  return store.get(id) || null
}

export function setSourceSubtitle(id, content) {
  store.set(`source:${id}`, { content, createdAt: Date.now() })
}

export function getSourceSubtitle(id) {
  return store.get(`source:${id}`) || null
}

export function getAnySubtitle(rawId) {
  return store.get(rawId) || store.get(`source:${rawId}`) || null
}