import { NextResponse } from 'next/server';
import type { PaymentOptions } from '@/types/payment';

export async function GET(): Promise<NextResponse<PaymentOptions>> {
  return NextResponse.json({
    bank: true,
    qpay: Boolean(process.env.QPAY_INVOICE_URL?.trim() && process.env.QPAY_INVOICE_AUTH?.trim()),
    demo: process.env.NODE_ENV !== 'production',
  });
}
