// Rich interactive client for noTrack.ai.
// - Streaming with markdown/code rendering, word-wrap
// - Slash commands: /new /model /copy /help /quit /stealth
// - Model switch mid-session, conversation memory via chat_id
//
// Usage:
//   node scripts/notrack-chat.mjs                    interactive (standard)
//   node scripts/notrack-chat.mjs "question"         one-shot
//   node scripts/notrack-chat.mjs --model reasoning  interactive with model
//   node scripts/notrack-chat.mjs --stealth          private: fresh session, no memory
import { randomUUID } from 'crypto'
import readline from 'readline'
import { execSync } from 'child_process'

const ENDPOINT = 'https://notrack.ai/api/dispatch'
const MODELS = ['fast', 'standard', 'reasoning']
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36'

const args = process.argv.slice(2)
const STEALTH = args.includes('--stealth')
const modelArg = args.find((a) => a.startsWith('--model'))
const model = modelArg ? modelArg.split('=')[1] : 'standard'
const promptArgs = args.filter((a) => !a.startsWith('--')).join(' ')

const ANSI = process.env.NO_COLOR ? {} : {
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  gray: (s) => `\x1b[90m${s}\x1b[0m`,
}

let session = randomUUID().replaceAll('-', '')
let uid = randomUUID()
const cookies = () => `si_usr_id=${session}; si_ses_id=${session}; uid=${uid}`

function freshSession() {
  session = randomUUID().replaceAll('-', '')
  uid = randomUUID()
}

function needsWrap(text, width = process.stdout.columns ?? 100) {
  return text.split('\n').some((line) => line.length > width)
}
function wrap(text, width = process.stdout.columns ?? 100) {
  let chunk = ''
  let size = 0
  const lines = []
  for (const ch of text) {
    if (ch === '\n') { lines.push(chunk); chunk = ''; size = 0; continue }
    size += ch === '\t' ? 2 : 1
    if (size > width) { lines.push(chunk); chunk = ''; size = 0 }
    chunk += ch
  }
  if (chunk) lines.push(chunk)
  return lines.join('\n')
}

function render(text) {
  const lines = text.split('\n')
  let out = ''
  let inCode = false
  for (const line of lines) {
    const fence = line.match(/^```(\w*)/)
    if (fence) {
      out += inCode ? ANSI.gray('```') + '\n' : ANSI.gray('```' + (fence[1] || '')) + '\n'
      inCode = !inCode
    } else if (inCode) {
      out += ANSI.cyan(line) + '\n'
    } else if (/^(#{1,6})\s/.test(line)) {
      out += ANSI.bold(line) + '\n'
    } else if (/^[-*] /.test(line)) {
      out += ANSI.gray(line.slice(0, 2)) + line.slice(2) + '\n'
    } else if (/^\d+\. /.test(line)) {
      out += line + '\n'
    } else {
      out += (needsWrap(line) ? wrap(line) : line) + '\n'
    }
  }
  return out.trimEnd()
}

function buildInput(history) {
  const parts = history
    .map((m) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`)
    .join('\n\n')
  const MAX = 4000
  return `System: The user is coding in a project. Answer concisely.\n\n${parts.slice(-(MAX - 65))}`
}

async function stream(userInput, modelName, chatId, history) {
  let newChatId = chatId
  let output = ''
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://notrack.ai', Referer: 'https://notrack.ai/chat', 'User-Agent': UA, Cookie: cookies() },
    body: JSON.stringify({ user_input: userInput, mode: 'usual', model: modelName, persona: 'normal', max_turns: 6, chat_id: chatId ?? null, attachments: [], regenerate: false }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
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
        if (j.type === 'chat_meta' && typeof j.chat_id === 'string' && !STEALTH) newChatId = j.chat_id
        if (j.type === 'delta' && typeof j.chunk === 'string') {
          output += j.chunk
          process.stdout.write(j.chunk)
        }
      } catch { /* partial */ }
    }
  }
  process.stdout.write('\n\n')
  return { output, newChatId }
}

const history = []
const copyOf = { last: '' }

if (promptArgs) {
  const { output, newChatId } = await stream(buildInput(history.concat([{ role: 'user', content: promptArgs }])), model, null, history)
  console.log(ANSI.dim(`\n[${model} · chat_id=${newChatId} · ${output.length} chars· exit with /quit]`))
  process.exit(0)
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
let currentModel = model
let chatId = null

console.log(ANSI.bold('noTrack chat') + (STEALTH ? ANSI.red(' [STEALTH]') : '') + ` · model ${ANSI.cyan(currentModel)} · ${ANSI.dim('type /help')}`)
rl.setPrompt(ANSI.green('› '))
rl.prompt()

rl.on('line', async (raw) => {
  const line = raw.trim()
  if (!line) { rl.prompt(); return }

  if (line === '/quit' || line === '/exit') { console.log(ANSI.dim('bye')); process.exit(0) }
  if (line === '/help') {
    console.log(ANSI.yellow('commands:') + [
      '  /new           start fresh conversation',
      '  /model NAME    switch model (fast|standard|reasoning)',
      '  /copy          copy last reply to clipboard',
      '  /stealth OFF   re-enable memory (stealth disables it)',
      '  /quit, /exit   leave',
    ].join('\n'))
    rl.prompt(); return
  }
  if (line === '/new') { chatId = null; history.length = 0; console.log(ANSI.dim('new conversation')); rl.prompt(); return }
  if (line === '/copy') {
    if (copyOf.last) { try { execSync('pbcopy', { input: copyOf.last }); console.log(ANSI.dim('copied')) } catch { process.stdout.write(copyOf.last) } }
    else console.log(ANSI.dim('nothing to copy yet'))
    rl.prompt(); return
  }
  if (line === '/stealth OFF') { STEALTH = false; console.log(ANSI.dim('memory enabled')); rl.prompt(); return }
  if (line.startsWith('/model')) {
    const m = line.split(/\s+/)[1]
    if (m && MODELS.includes(m)) { currentModel = m; console.log(ANSI.cyan(m)) }
    else console.log(ANSI.dim('usage: /model fast|standard|reasoning'))
    rl.prompt(); return
  }
  if (line.startsWith('/')) { console.log(ANSI.dim('unknown command — /help')); rl.prompt(); return }

  history.push({ role: 'user', content: line })
  try {
    const { output, newChatId } = await stream(buildInput(history), currentModel, chatId, history)
    copyOf.last = output
    if (newChatId) chatId = newChatId
    history.push({ role: 'assistant', content: output })
  } catch (e) {
    console.error(ANSI.red('error: ' + e.message))
  }
  rl.prompt()
})