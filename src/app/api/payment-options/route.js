import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    bank: true,
    qpay: Boolean(process.env.QPAY_INVOICE_URL?.trim() && process.env.QPAY_INVOICE_AUTH?.trim()),
    demo: process.env.NODE_ENV !== 'production',
  })
}
