import { NextRequest, NextResponse } from 'next/server';
import { getDb, requireUser, rateLimit } from '@/db/index.mjs';
import { recentCheckoutRequests } from '@/db/payment-fulfillment.mjs';
import { hostedCheckoutUrl } from '@/lib/wire.mjs';
import { recoveryPaymentSchema } from '@/lib/payments/recovery';
import { z } from 'zod';

const rowSchema = recoveryPaymentSchema.extend({
  amountMnt: z.coerce.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  checkoutUrl: z.unknown().transform((value) => hostedCheckoutUrl(value)),
});

export async function GET(request: NextRequest) {
  const { user, error } = await requireUser(request.cookies.get('mn_session')?.value);
  if (error) return NextResponse.json({ error }, { status: 401 });
  if (rateLimit(`payment-recovery:${user.id}`, { max: 30, windowMs: 60_000 }).limited)
    return NextResponse.json({ error: { code: 'RATE_LIMITED' } }, { status: 429 });
  const rows = await recentCheckoutRequests(await getDb(), user.id);
  const payments = rows.flatMap((row: unknown) => {
    const parsed = rowSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
  return NextResponse.json(
    { ownerId: user.id, payments },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
