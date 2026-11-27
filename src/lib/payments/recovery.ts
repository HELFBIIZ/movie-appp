import { z } from 'zod';
import { safeReturnTo } from '../safe-return.ts';
import { hostedCheckoutUrl } from './checkout-url.mjs';

export const recoveryPaymentSchema = z.object({
  txnId: z.string().regex(/^tx_[a-f0-9-]{36}$/),
  status: z.enum(['PENDING', 'PROCESSING', 'SUCCESSFUL']),
  amountMnt: z.number().finite().nonnegative(),
  planName: z.string().min(1).max(200),
  returnTo: z.string().transform((value) => safeReturnTo(value)),
  checkoutUrl: z
    .string()
    .nullable()
    .transform((value) => hostedCheckoutUrl(value)),
});
export const recoveryResponseSchema = z.object({
  ownerId: z.string().min(1).max(200),
  payments: z.array(recoveryPaymentSchema).max(3),
});
export type RecoveryPayment = z.infer<typeof recoveryPaymentSchema>;
