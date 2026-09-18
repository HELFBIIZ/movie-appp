// GET /api/health — Health check endpoint for monitoring.
//
// Returns:
//   200 { status: 'ok', timestamp, version }
//   503 { status: 'error', timestamp, error: string }

import { NextResponse } from 'next/server'
import { isWireConfigured } from '../../../../lib/wire.mjs'

export async function GET() {
  try {
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      wire: isWireConfigured() ? 'configured' : 'not_configured',
    })
  } catch (err) {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: err.message,
    }, { status: 503 })
  }
}
