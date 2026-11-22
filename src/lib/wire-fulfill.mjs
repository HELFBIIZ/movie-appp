import { activatePaymentSuccess } from '../db/index.mjs';
import { retrievePaymentIntent, wirePaymentMatches } from './wire.mjs';

export async function reconcileWirePayment(payment) {
  if (payment.status === 'SUCCESSFUL') return { payment, alreadyActivated: true };
  if (payment.provider !== 'wire' || !payment.providerRef) return { payment, pending: true };
  const intent = await retrievePaymentIntent(payment.providerRef);
  if (!intent || intent.error) return { error: { code: 'WIRE_VERIFICATION_UNAVAILABLE' } };
  if (intent.status !== 'succeeded')
    return {
      payment,
      pending: true,
      gatewayStatus: typeof intent.status === 'string' ? intent.status : 'unknown',
    };
  if (!wirePaymentMatches(payment, intent)) return { error: { code: 'WIRE_PAYMENT_MISMATCH' } };
  return activatePaymentSuccess(payment.txnId);
}
