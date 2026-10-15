import crypto from 'node:crypto'

// Thin client for the CipherPay REST API (https://www.cipherpay.app/en/docs).

export type InvoiceStatus =
  | 'draft'
  | 'pending'
  | 'underpaid'
  | 'detected'
  | 'confirmed'
  | 'expired'
  | 'refunded'

export type CreatedInvoice = {
  invoice_id: string
  memo_code: string
  price_zec: number
  payment_address: string
  zcash_uri: string
  expires_at: string
}

export type Invoice = {
  id: string
  status: InvoiceStatus
  price_zec: number
  received_zec: number | null
  detected_txid: string | null
  expires_at: string
}

export type WebhookEvent = {
  event: string
  invoice_id: string
  txid?: string
  price_zec?: number
  received_zec?: number
  overpaid?: boolean
}

const API_URL = (process.env.CIPHERPAY_API_URL || 'https://api.cipherpay.app').replace(/\/+$/, '')
const API_KEY = process.env.CIPHERPAY_API_KEY

const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000

export const apiUrl = API_URL

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`CipherPay ${init.method ?? 'GET'} ${path} → ${res.status}: ${text}`)
  return JSON.parse(text) as T
}

export function createInvoice(body: {
  amount: number
  currency: string
  product_name: string
  size: string
}): Promise<CreatedInvoice> {
  if (!API_KEY) throw new Error('CIPHERPAY_API_KEY is not set')
  return request('/api/invoices', {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify(body),
  })
}

/** Public lookup; no API key required. */
export function getInvoice(id: string): Promise<Invoice> {
  return request(`/api/invoices/${encodeURIComponent(id)}`)
}

/**
 * Verifies X-CipherPay-Signature: hex HMAC-SHA256 over `${timestamp}.${rawBody}`
 * keyed with the webhook secret, rejecting timestamps more than 5 minutes off.
 */
export function verifyWebhook(
  rawBody: Buffer,
  signature: string | undefined,
  timestamp: string | undefined,
  secret: string | undefined,
): boolean {
  if (!secret || !signature || !timestamp || !/^[a-f0-9]{64}$/i.test(signature)) return false

  const sentAt = Date.parse(timestamp)
  if (!Number.isFinite(sentAt) || Math.abs(Date.now() - sentAt) > SIGNATURE_MAX_AGE_MS) return false

  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest()
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), expected)
}
