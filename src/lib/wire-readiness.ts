import { z } from 'zod';
import { wireConfigured, previewWireRouting, listWireBankAccounts } from './wire.mjs';

const CHECK_AMOUNT_MNT = 5900;
const previewSchema = z.object({
  object: z.literal('routing_preview'),
  selected: z.string().regex(/^op_[a-zA-Z0-9_-]+$/),
});
const accountsSchema = z.object({
  object: z.literal('list'),
  data: z
    .array(
      z.object({
        object: z.literal('bank_account'),
        is_default: z.boolean(),
        settlement_selectable: z.boolean(),
      }),
    )
    .max(1000),
});
const errorSchema = z.object({ error: z.object({ status: z.number().int() }) });
type ReadinessStatus =
  | 'not_configured'
  | 'available'
  | 'authentication_failed'
  | 'operator_unavailable'
  | 'settlement_missing'
  | 'unavailable';
type WireReadiness = {
  configured: boolean;
  apiReachable: boolean;
  routingAvailable: boolean;
  settlementConfigured: boolean;
  checkedAmountMnt: number;
  paidTransactionVerified: false;
  checkedAt: string;
  status: ReadinessStatus;
};
type Dependencies = {
  configured: () => boolean;
  preview: () => Promise<unknown>;
  banks: () => Promise<unknown>;
  now: () => number;
};
export function createWireReadinessCheck({
  configured = wireConfigured,
  preview = () => previewWireRouting(CHECK_AMOUNT_MNT),
  banks = listWireBankAccounts,
  now = Date.now,
}: Partial<Dependencies> = {}) {
  let cached: WireReadiness | null = null;
  let expiresAt = 0;
  let pending: Promise<WireReadiness> | null = null;
  return async function check(): Promise<WireReadiness> {
    const base = {
      configured: configured(),
      apiReachable: false,
      routingAvailable: false,
      settlementConfigured: false,
      checkedAmountMnt: CHECK_AMOUNT_MNT,
      paidTransactionVerified: false as const,
      checkedAt: new Date(now()).toISOString(),
    };
    if (!base.configured) {
      cached = null;
      expiresAt = 0;
      return { ...base, status: 'not_configured' };
    }
    if (cached && now() < expiresAt) return cached;
    if (pending) return pending;
    pending = (async () => {
      const results = await Promise.allSettled([preview(), banks()]);
      const routing = results[0].status === 'fulfilled' ? results[0].value : null;
      const accounts = results[1].status === 'fulfilled' ? results[1].value : null;
      const parsedRoute = previewSchema.safeParse(routing);
      const parsedAccounts = accountsSchema.safeParse(accounts);
      const settlement =
        parsedAccounts.success &&
        parsedAccounts.data.data.some(
          (account) => account.is_default && account.settlement_selectable,
        );
      const errors = [routing, accounts]
        .map((value) => errorSchema.safeParse(value))
        .filter((parsed) => parsed.success)
        .map((parsed) => parsed.data.error.status);
      const routeError = errorSchema.safeParse(routing);
      const status: ReadinessStatus = errors.some((code) => code === 401 || code === 403)
        ? 'authentication_failed'
        : !parsedAccounts.success
          ? 'unavailable'
          : !parsedRoute.success
            ? routeError.success && routeError.data.error.status === 400
              ? 'operator_unavailable'
              : 'unavailable'
            : !settlement
              ? 'settlement_missing'
              : 'available';
      // Publish aggregates only; raw bank details, routing IDs and errors stay private.
      cached = {
        ...base,
        apiReachable: parsedRoute.success || parsedAccounts.success,
        routingAvailable: parsedRoute.success,
        settlementConfigured: Boolean(settlement),
        status,
      };
      expiresAt = now() + (status === 'available' ? 60_000 : 15_000);
      return cached;
    })().finally(() => {
      pending = null;
    });
    return pending;
  };
}
export const checkWireReadiness = createWireReadinessCheck();
