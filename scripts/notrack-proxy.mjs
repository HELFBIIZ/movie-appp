// Local OpenAI-compatible proxy for noTrack.ai (v2).
// Exposes /v1/chat/completions (streaming + non-streaming), /v1/models, /health.
//
// Improvements over v1:
//  - Conversation memory: chat_id is reused per conversation thread (keyed by a
//    stable hash of the message history prefix), and only the latest user turn is
//    sent on follow-ups (noTrack keeps history server-side). No more 400 timeouts.
//  - Reliability: throttle, retry w/ backoff, and automatic model fallback
//    (reasoning -> standard -> fast) when the requested model is overloaded.
//  - Attachment support: images (base64) and text files can be sent via the
//    attachments[] field; plain text files are inlined into user_input.
//  - Stealth mode: NOTRACK_STEALTH=1 -> fresh anonymous session per request,
//    no chat_id memory, no verbose error logs (matches the "no profile" ethos).
//  - /health endpoint for uptime monitoring.
//
// Usage: node scripts/notrack-proxy.mjs [port:4321] [--stealth]
// Point any OpenAI-compatible client (Continue, Cline, LM Studio) at
// http://localhost:4321/v1  (apiKey can be anything).
import http from 'http'
import { createHash, randomUUID } from 'crypto'

const PORT = Number(process.argv.find((a) => /^\d/.test(a)) ?? 4321)
const STEALTH = process.env.NOTRACK_STEALTH === '1' || process.argv.includes('--stealth')
const DISPATCH = 'https://notrack.ai/api/dispatch'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36'
const MAX_INPUT = 4000
const SILENT = STEALTH

const log = (...a) => { if (!SILENT) console.error(...a) }

// ---- anonymous session ----
const SESSION = randomUUID().replaceAll('-', '')
const UID = randomUUID()
function cookies() {
  return `si_usr_id=${SESSION}; si_ses_id=${SESSION}; uid=${UID}`
}

// ---- conversation memory: chat_id keyed by history prefix hash ----
const chatIdByThread = new Map()
function threadKey(messages) {
  // All messages except the very last turn = the stable "history prefix".
  const history = messages.slice(0, -1)
  return createHash('sha256').update(JSON.stringify(history)).digest('hex').slice(0, 16)
}

// ---- throttle + retry + fallback ----
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const FALLBACK = { reasoning: ['standard', 'fast'], standard: ['fast'], fast: [] }
let lastDispatch = 0

async function dispatchOnce(body) {
  const wait = lastDispatch + 250 - Date.now()
  if (wait > 0) await sleep(wait)
  lastDispatch = Date.now()
  try {
    const res = await fetch(DISPATCH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://notrack.ai',
        Referer: 'https://notrack.ai/chat',
        'User-Agent': UA,
        Cookie: cookies(),
      },
      body: JSON.stringify(body),
    })
    return res
  } catch {
    return null
  }
}

async function dispatch(model, input, chatId) {
  const body = noTrackBody(model, input, chatId)
  const maxAttempts = 5
  let attempt = 1
  for (;;) {
    const res = await dispatchOnce(body)
    if (res && res.ok) return res
    const status = res ? res.status : 'net'
    const retryable = res && [400, 429, 500, 502, 503, 504].includes(res.status)
    if (!retryable) throw new Error(`noTrack HTTP ${status}`)
    if (attempt >= maxAttempts) {
      // Overloaded requested model -> fall back to a lighter one.
      const fallbacks = FALLBACK[model] ?? []
      if (fallbacks.length) {
        log(`[model ${model} exhausted, falling back to ${fallbacks[0]}]`)
        return dispatch(fallbacks[0], input, chatId)
      }
      throw new Error('noTrack retries exhausted')
    }
    const waitMs = Math.min(2000 * attempt, 8000) + Math.floor(Math.random() * 500)
    log(`[noTrack HTTP ${status} attempt ${attempt}/${maxAttempts}, retry in ${waitMs}ms]`)
    await sleep(waitMs)
    attempt++
  }
}

// ---- message -> user_input conversion ----
const PREFIX = 'System: The user is coding in the attached project. Answer concisely.\n\n'

function flattenContent(content) {
  if (typeof content === 'string') return { text: content, images: [], files: [] }
  if (!Array.isArray(content)) return { text: '', images: [], files: [] }
  const parts = { text: '', images: [], files: [] }
  for (const p of content) {
    if (p.type === 'text') parts.text += (p.text ?? '')
    else if (p.type === 'image_url') parts.images.push(p.image_url?.url ?? '')
    else if (p.type === 'text_file') parts.files.push(p)
    else if (p.text_file?.text) parts.files.push(p)
  }
  return parts
}

function buildInput(messages) {
  const parts = []
  const attachments = []
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]
    const role = m.role === 'assistant' ? 'Assistant' : m.role === 'system' ? 'System' : 'User'
    const { text, images, files } = flattenContent(m.content)
    for (const img of images) {
      attachments.push({ type: 'image', data: img.startsWith('data:') ? img : `data:image/png;base64,${img}` })
    }
    for (const f of files) {
      if (typeof f === 'string') { attachments.push({ type: 'file', data: f, mime_type: 'text/plain' }); continue }
      const body = f.text ?? f.content ?? f.data
      const name = f.filename ?? 'file.txt'
      const mime = f.mediaType ?? f.mime_type ?? 'text/plain'
      if (mime.startsWith('text/') || mime.includes('json') || mime.includes('javascript') || mime.includes('typescript') || mime.includes('yaml')) {
        parts.push(`File ${name}:\n${body}`) // inline for text files
      } else {
        attachments.push({ type: 'file', filename: name, data: body, mime_type: mime })
      }
    }
    parts.push(`${role}: ${text}`)
  }
  const joined = parts.join('\n\n')
  const cap = MAX_INPUT - PREFIX.length
  return { input: PREFIX + joined.slice(-cap), attachments }
}

// ---- noTrack body ----
function noTrackBody(model, input, chatId, attachments = []) {
  return {
    user_input: input,
    mode: 'usual',
    model,
    persona: 'normal',
    max_turns: 6,
    chat_id: chatId ?? null,
    attachments,
    regenerate: false,
  }
}

// ---- streaming (streams chunks + reports chat_meta) ----
async function* requestToText(params, onMeta) {
  const { model, input, chatId } = params
  const res = await dispatch(model, input, chatId)
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const events = buf.split('\n\n')
    buf = events.pop()
    for (const ev of events) {
      const line = ev.split('\n')[0].replace(/^data:\s*/, '')
      if (!line) continue
      try {
        const j = JSON.parse(line)
        if (j.type === 'chat_meta' && typeof j.chat_id === 'string' && !STEALTH) onMeta(j.chat_id)
        if (j.type === 'delta' && typeof j.chunk === 'string') yield j.chunk
      } catch { /* partial */ }
    }
  }
}

// ---- HTTP server ----
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end() }
  const sendJson = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)) }

  if (req.method === 'GET' && url.pathname === '/health') {
    return sendJson(200, { ok: true, stealth: STEALTH, models: ['fast', 'standard', 'reasoning'], uptime: process.uptime().toFixed(1) })
  }
  if (req.method === 'GET' && url.pathname === '/v1/models') {
    return sendJson(200, { object: 'list', data: ['fast', 'standard', 'reasoning'].map((id) => ({ id, object: 'model', owned_by: 'notrack' })) })
  }
  if (req.method === 'POST' && url.pathname === '/v1/chat/completions') {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', async () => {
      let parsed
      try { parsed = JSON.parse(body) } catch { return sendJson(400, { error: { message: 'bad json' } }) }
      let model = parsed.model ?? 'standard'
      const messages = parsed.messages ?? []
      const stream = parsed.stream === true
      const key = STEALTH ? randomUUID() : threadKey(messages)
      const chatId = STEALTH ? null : (chatIdByThread.get(key) ?? null)
      const { input, attachments } = buildInput(messages)
      const meta = (id) => { if (!STEALTH) chatIdByThread.set(key, id) }
      const emit = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`)

      if (!stream) {
        try {
          let text = ''
          for await (const chunk of requestToText({ model, input, chatId, attachments }, meta)) text += chunk
          return sendJson(200, {
            id: `chatcmpl-${randomUUID()}`, object: 'chat.completion', created: Math.floor(Date.now() / 1000), model,
            choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }],
            usage: { total_tokens: 0, prompt_tokens: 0, completion_tokens: 0 },
          })
        } catch (e) { return sendJson(502, { error: { message: e.message } }) }
      }

      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
      emit({ id: `chatcmpl-${randomUUID()}`, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model, choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }] })
      try {
        for await (const chunk of requestToText({ model, input, chatId, attachments }, meta)) {
          emit({ id: `chatcmpl-${randomUUID()}`, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model, choices: [{ index: 0, delta: { content: chunk }, finish_reason: null }] })
        }
      } catch (e) {
        emit({ error: { message: e.message } })
      }
      emit({ id: `chatcmpl-${randomUUID()}`, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] })
      emit(null) // [DONE]
      res.end()
    })
    return
  }
  return sendJson(404, { error: { message: 'not found' } })
})

server.listen(PORT, () => {
  console.log(`noTrack proxy v2 listening on http://localhost:${PORT}/v1  (stealth: ${STEALTH})`)
  console.log('Models: fast, standard, reasoning (auto-fallback on overload)')
})