import { NextResponse } from 'next/server'

const names = [
  'OPENSUBTITLES_API_KEY',
  'OPENSUBTITLES_API_BASE',
  'OPENSUBTITLES_USERNAME',
  'OPENSUBTITLES_PASSWORD',
  'TRANSLATEAPI_API_KEY',
]

export async function GET() {
  const info = Object.fromEntries(
    names.map((n) => [n, process.env[n] ? `${process.env[n].length} chars set` : '(missing)'])
  )
  return NextResponse.json(info)
}