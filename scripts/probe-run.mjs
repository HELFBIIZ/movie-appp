import { register } from 'node:module'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
const req = createRequire(import.meta.url)
register('./probe-stub.mjs', pathToFileURL('./'))
const url = pathToFileURL('./scripts/probe-db.mjs').href
const mod = await import(url)
