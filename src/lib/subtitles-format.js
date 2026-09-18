export function parseCues(content) {
  let text = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim()
  if (text.startsWith('WEBVTT')) {
    text = text
      .replace(/^WEBVTT.*$/i, '')
      .replace(/^STYLE[\s\S]*?^$/gm, '')
      .replace(/^NOTE[\s\S]*?^$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
  const cues = []
  for (const block of blocks) {
    const lines = block.split('\n')
    const timeIdx = lines.findIndex((l) => /-->/.test(l))
    if (timeIdx === -1) continue
    const id = timeIdx === 0 ? '' : lines[timeIdx - 1].trim()
    const timing = lines[timeIdx].trim()
    const cueText = lines.slice(timeIdx + 1).join('\n').trim()
    if (!cueText || !timing) continue
    cues.push({ id, timing, text: cueText })
  }
  return cues
}

export function buildVtt(cues) {
  return [
    'WEBVTT',
    '',
    ...cues.map((c, i) => {
      const timing = c.timing.replace(/,(\d{3})/g, '.$1')
      const id = c.id || String(i + 1)
      return `${id}\n${timing}\n${c.text}`
    }),
    '',
  ].join('\n')
}

export function normalizeToVtt(content) {
  return buildVtt(parseCues(content))
}