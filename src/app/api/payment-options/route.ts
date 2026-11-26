import { NextResponse } from 'next/server';
import type { PaymentOptions } from '@/types/payment';
import { wireConfigured } from '@/lib/wire.mjs';
import { qpayConfigured } from '@/lib/qpay.mjs';

export async function GET(): Promise<NextResponse<PaymentOptions>> {
  return NextResponse.json({
    bank: true,
    qpay: qpayConfigured(),
    demo: process.env.NODE_ENV !== 'production',
    wire: wireConfigured(),
  });
}
