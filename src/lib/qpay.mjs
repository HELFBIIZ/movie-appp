import crypto from 'crypto';

const env = (key) => process.env[key]?.trim();

function basicAuth() {
  const configured = env('QPAY_INVOICE_AUTH');
  if (configured) {
    return configured.includes(':') ? Buffer.from(configured).toString('base64') : configured;
  }
  const username = env('QPAY_USERNAME');
  const password = env('QPAY_PASSWORD');
  return username && password ? Buffer.from(`${username}:${password}`).toString('base64') : null;
}

async function accessToken() {
  const existing = env('QPAY_ACCESS_TOKEN');
  if (existing) return existing;
  const auth = basicAuth();
  const url = env('QPAY_TOKEN_URL') || 'https://merchant.qpay.mn/v2/auth/token';
  if (!auth) return null;
  const response = await fetch(url, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
  });
  if (!response.ok)
    return { error: { status: response.status, body: (await response.text()).slice(0, 300) } };
  const data = await response.json();
  return data?.access_token || data?.token || null;
}

function invoiceUrl() {
  const configured = env('QPAY_INVOICE_URL');
  if (env('QPAY_INVOICE_CREATE_URL')) return env('QPAY_INVOICE_CREATE_URL');
  if (!configured || /\/auth\/token/i.test(configured))
    return 'https://merchant.qpay.mn/v2/invoice';
  return configured;
}

export async function createQpayInvoice({ txnId, amountMnt, description, callbackUrl }) {
  const auth = basicAuth();
  if (!auth && !env('QPAY_ACCESS_TOKEN')) {
    console.error(
      '[QPay] Missing credentials: set QPAY_INVOICE_AUTH or QPAY_USERNAME/QPAY_PASSWORD',
    );
    return null;
  }
  try {
    const explicitUrl =
      env('QPAY_INVOICE_CREATE_URL') ||
      (env('QPAY_INVOICE_URL') && !/\/auth\/token/i.test(env('QPAY_INVOICE_URL')));
    const token = env('QPAY_ACCESS_TOKEN') || (!explicitUrl ? await accessToken() : null);
    if (token?.error) return { error: { stage: 'token', ...token.error } };
    const url = invoiceUrl();
    new URL(url);
    const response = await fetch(url, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : `Basic ${auth}`,
      },
      body: JSON.stringify({
        invoice_description: String(description || 'Movie-App subscription').slice(0, 200),
        invoice_no: txnId,
        amount: amountMnt,
        callback_url: callbackUrl || null,
      }),
    });
    if (!response.ok) {
      const body = (await response.text()).slice(0, 300);
      console.error(`[QPay] HTTP ${response.status}: ${body}`);
      return { error: { stage: 'invoice', status: response.status, body } };
    }
    const data = await response.json();
    return {
      invoiceId: data.invoice_id || null,
      shortRef: data.qpay_shortRef || null,
      qrImage: data.qr_image || null,
      url: data.QR || data.payment_url || null,
    };
  } catch (err) {
    const message = String(err?.message || err);
    console.error(`[QPay] fetch failed: ${message}`);
    return { error: { stage: 'invoice', message: message.slice(0, 200) } };
  }
}

export function verifyQpayToken(provided, secret) {
  if (!provided || !secret) return false;
  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(secret));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function checkQpayInvoices(invoiceIds) {
  const auth = basicAuth();
  if ((!auth && !env('QPAY_ACCESS_TOKEN')) || !invoiceIds?.length) return null;
  try {
    const explicitUrl = env('QPAY_PAYMENT_CHECK_URL');
    const token = env('QPAY_ACCESS_TOKEN') || (!explicitUrl ? await accessToken() : null);
    if (token?.error) return { error: { stage: 'token', ...token.error } };
    const url = explicitUrl || 'https://merchant.qpay.mn/v2/payment/check';
    const response = await fetch(url, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : `Basic ${auth}`,
      },
      body: JSON.stringify({ invoice_id: invoiceIds }),
    });
    if (!response.ok)
      return {
        error: {
          stage: 'check',
          status: response.status,
          body: (await response.text()).slice(0, 300),
        },
      };
    const data = await response.json();
    return { rows: Array.isArray(data.rows) ? data.rows : [] };
  } catch (err) {
    return { error: { stage: 'check', message: String(err?.message || err).slice(0, 200) } };
  }
}

export function qpayConfigured() {
  return Boolean(env('QPAY_ACCESS_TOKEN') || basicAuth());
}

export function isQpayPaid(row) {
  return Boolean(
    row &&
    ['PAID', 'SETTLED', 'SUCCESSFUL'].includes(
      String(row.payment_status || row.status || '').toUpperCase(),
    ),
  );
}
