// src/lib/qpay.mjs — QPay RestInvoice client (server-only, env-gated).
//
// Truthfulness rule (same as db.mjs's doctrine): no QPay credential → these
// calls return null; nothing here fakes an approval. The payment row stays
// PENDING until a real, signature-checked webhook flips it. Configure with:
//   QPAY_INVOICE_URL    e.g. https://merchant.qpay.mn/v2/auth/token then invoice URL
//   QPAY_INVOICE_AUTH   base64("username:password")
//   QPAY_CALLBACK_TOKEN shared secret the webhook verifies (x-qpay-signature)
//   QPAY_PAYMENT_CHECK_URL  default https://merchant.qpay.mn/v2/payment/check
import crypto from 'crypto'

const env = (key) => process.env[key]?.trim()

export async function createQpayInvoice({ txnId, amountMnt, description, callbackUrl }) {
  const url = env('QPAY_INVOICE_URL')
  const auth = env('QPAY_INVOICE_AUTH')
  if (!url || !auth) return null
  try {
    const res = await fetch(url, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        invoice_description: String(description || 'Movie-App subscription').slice(0, 200),
        invoice_no: txnId, // echoes back on the callback — our reconciliation key
        amount: amountMnt,
        callback_url: callbackUrl || null,
      }),
    })
    if (!res.ok) return { error: { status: res.status, body: (await res.text()).slice(0, 200) } }
    const j = await res.json()
    return {
      invoiceId: j.invoice_id || null,
      shortRef: j.qpay_shortRef || null,
      qrImage: j.qr_image || null,
      url: j.QR || null,
    }
  } catch (err) {
    return { error: { message: String(err?.message || err).slice(0, 200) } }
  }
}

export function verifyQpayToken(provided, secret) {
  if (!provided || !secret) return false
  const a = Buffer.from(String(provided))
  const b = Buffer.from(String(secret))
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

/**
 * Poll QPay for the real payment status of invoices we created.
 * QPay v2: POST /v2/payment/check { invoice_id: [...] } →
 *   { rows: [{ invoice_id, amount, payment_status: PAID|CLOSED|CREATED, … }] }
 * Without QPAY_INVOICE_AUTH (or a check URL) this returns null — never a fake
 * "paid". Used by both the payer-side poll route and the qpay-watcher daemon,
 * which then complete the payment server-side via the signed webhook.
 */
export async function checkQpayInvoices(invoiceIds) {
  const auth = env('QPAY_INVOICE_AUTH')
  const base = env('QPAY_PAYMENT_CHECK_URL') || 'https://merchant.qpay.mn/v2/payment/check'
  if (!auth || !invoiceIds?.length) return null
  try {
    const res = await fetch(base, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({ invoice_id: invoiceIds }),
    })
    if (!res.ok) return { error: { status: res.status, body: (await res.text()).slice(0, 200) } }
    const j = await res.json()
    return { rows: Array.isArray(j.rows) ? j.rows : [] }
  } catch (err) {
    return { error: { message: String(err?.message || err).slice(0, 200) } }
  }
}

/** True when a QPay /v2/payment/check row means money actually arrived. */
export function isQpayPaid(row) {
  return !!row && (row.payment_status === 'PAID' || row.payment_status === 'SETTLED')
}