import { Redis } from '@upstash/redis'
import type { Billing, PlanName } from '../shared/pricing.js'

// Invoice tracking state. Uses Upstash Redis when configured (required on
// Vercel, where each request may hit a different function instance) and falls
// back to process memory for local development.

export type Status = 'pending' | 'underpaid' | 'detected' | 'expired' | 'confirmed'

export type Tracked = {
  plan: PlanName
  billing: Billing
  amountUsd: number
  status: Status
  priceZec: number
  receivedZec: number | null
  txid: string | null
  createdAt: number
  webhookSeen: boolean
  lastReconcileAt: number
}

export type Store = {
  kind: string
  get(id: string): Promise<Tracked | null>
  set(id: string, value: Tracked): Promise<void>
  /** Records a webhook delivery id; false if it was already seen. */
  claimDelivery(deliveryId: string): Promise<boolean>
}

const INVOICE_TTL_S = 2 * 24 * 60 * 60
const DELIVERY_TTL_S = 7 * 24 * 60 * 60

function redisStore(redis: Redis): Store {
  return {
    kind: 'upstash',
    get: (id) => redis.get<Tracked>(`zc:inv:${id}`),
    set: async (id, value) => {
      await redis.set(`zc:inv:${id}`, value, { ex: INVOICE_TTL_S })
    },
    claimDelivery: async (deliveryId) =>
      (await redis.set(`zc:dlv:${deliveryId}`, 1, { nx: true, ex: DELIVERY_TTL_S })) === 'OK',
  }
}

function memoryStore(): Store {
  const invoices = new Map<string, Tracked>()
  const deliveries = new Set<string>()
  return {
    kind: 'memory',
    get: async (id) => invoices.get(id) ?? null,
    set: async (id, value) => {
      invoices.set(id, value)
    },
    claimDelivery: async (deliveryId) => {
      if (deliveries.has(deliveryId)) return false
      deliveries.add(deliveryId)
      return true
    },
  }
}

// The Vercel Marketplace Upstash integration injects KV_REST_API_*; a direct
// Upstash setup uses UPSTASH_REDIS_REST_*.
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

export const store: Store = url && token ? redisStore(new Redis({ url, token })) : memoryStore()
