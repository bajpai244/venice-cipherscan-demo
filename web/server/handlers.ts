import { apiUrl, createInvoice, getInvoice, verifyWebhook, type WebhookEvent } from './cipherpay.js'
import { store, type Status, type Tracked } from './store.js'
import { chargeAmount, isBilling, isPlanName } from '../shared/pricing.js'

// Web-standard request handlers shared by the local dev server (server/index.ts)
// and the Vercel functions (api/).

const WEBHOOK_SECRET = process.env.CIPHERPAY_WEBHOOK_SECRET

// If no webhook has arrived this long after creation, the status endpoint
// re-reads the invoice from CipherPay so a broken webhook can't stall the demo.
const RECONCILE_AFTER_MS = 15_000
const RECONCILE_EVERY_MS = 10_000

// Statuses only move forward; a retried or late "detected" can't undo "confirmed".
const RANK: Record<Status, number> = { pending: 0, underpaid: 1, detected: 2, expired: 3, confirmed: 4 }

function isTrackedStatus(value: string): value is Status {
  return Object.hasOwn(RANK, value)
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status })
}

function advance(
  id: string,
  inv: Tracked,
  next: string,
  details: { txid?: string | null; receivedZec?: number | null },
  source: string,
) {
  if (!isTrackedStatus(next) || RANK[next] < RANK[inv.status]) return
  if (details.txid) inv.txid = details.txid
  if (details.receivedZec != null) inv.receivedZec = details.receivedZec
  if (next !== inv.status) {
    console.log(`[${source}] ${id} ${inv.status} → ${next}${inv.txid ? ` (txid ${inv.txid.slice(0, 12)}…)` : ''}`)
    inv.status = next
  }
}

export function health() {
  return json({ ok: true, cipherpay: apiUrl, webhookSecret: Boolean(WEBHOOK_SECRET), store: store.kind })
}

export async function checkout(request: Request) {
  const { plan, billing } = (await request.json().catch(() => ({}))) as Record<string, unknown>
  if (!isPlanName(plan) || !isBilling(billing)) return json({ error: 'Unknown plan or billing period' }, 400)

  const amountUsd = chargeAmount(plan, billing)
  try {
    const created = await createInvoice({
      amount: amountUsd,
      currency: 'USD',
      product_name: `Venice ${plan}`,
      size: billing === 'yearly' ? 'Yearly' : 'Monthly',
    })
    await store.set(created.invoice_id, {
      plan,
      billing,
      amountUsd,
      status: 'pending',
      priceZec: created.price_zec,
      receivedZec: null,
      txid: null,
      createdAt: Date.now(),
      webhookSeen: false,
      lastReconcileAt: 0,
    })
    console.log(`[checkout] ${created.invoice_id} Venice ${plan} ${billing} $${amountUsd} = ${created.price_zec} ZEC`)
    return json({
      invoiceId: created.invoice_id,
      memoCode: created.memo_code,
      priceZec: created.price_zec,
      paymentAddress: created.payment_address,
      zcashUri: created.zcash_uri,
      expiresAt: created.expires_at,
      amountUsd,
    })
  } catch (err) {
    console.error('[checkout] failed:', err)
    return json({ error: 'Could not create a Zcash invoice. Check the server log.' }, 502)
  }
}

export async function invoiceStatus(id: string) {
  const inv = await store.get(id)
  if (!inv) return json({ error: 'Unknown invoice' }, 404)

  const now = Date.now()
  const settled = inv.status === 'confirmed' || inv.status === 'expired'
  if (
    !settled &&
    !inv.webhookSeen &&
    now - inv.createdAt > RECONCILE_AFTER_MS &&
    now - inv.lastReconcileAt > RECONCILE_EVERY_MS
  ) {
    inv.lastReconcileAt = now
    try {
      const remote = await getInvoice(id)
      if (remote.status !== inv.status) {
        console.warn(`[reconcile] ${id} is "${remote.status}" at CipherPay but no webhook arrived; check the webhook URL`)
      }
      advance(id, inv, remote.status, { txid: remote.detected_txid, receivedZec: remote.received_zec }, 'reconcile')
    } catch (err) {
      console.warn('[reconcile] lookup failed:', err)
    }
    await store.set(id, inv)
  }

  return json({
    status: inv.status,
    plan: inv.plan,
    billing: inv.billing,
    amountUsd: inv.amountUsd,
    priceZec: inv.priceZec,
    receivedZec: inv.receivedZec,
    txid: inv.txid,
  })
}

export async function webhook(request: Request) {
  // The signature covers the exact bytes sent, so read the body raw.
  const rawBody = Buffer.from(await request.arrayBuffer())
  const ok = verifyWebhook(
    rawBody,
    request.headers.get('X-CipherPay-Signature') ?? undefined,
    request.headers.get('X-CipherPay-Timestamp') ?? undefined,
    WEBHOOK_SECRET,
  )
  if (!ok) {
    console.warn('[webhook] rejected: invalid signature or timestamp')
    return new Response('Invalid signature', { status: 401 })
  }

  let payload: WebhookEvent
  try {
    payload = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return new Response('Bad JSON', { status: 400 })
  }

  const deliveryId = request.headers.get('X-CipherPay-Delivery-Id')
  if (deliveryId && !(await store.claimDelivery(deliveryId))) return new Response('Duplicate')

  const inv = await store.get(payload.invoice_id)
  console.log(`[webhook] ${payload.event} for ${payload.invoice_id}${inv ? '' : ' (unknown invoice)'}`)
  if (inv) {
    inv.webhookSeen = true
    advance(payload.invoice_id, inv, payload.event, { txid: payload.txid, receivedZec: payload.received_zec }, 'webhook')
    await store.set(payload.invoice_id, inv)
  }
  return new Response('OK')
}

export function warnMissingConfig() {
  if (!process.env.CIPHERPAY_API_KEY) console.warn('[api] CIPHERPAY_API_KEY is not set; checkout will fail')
  if (!WEBHOOK_SECRET) console.warn('[api] CIPHERPAY_WEBHOOK_SECRET is not set; all webhooks will be rejected')
}
