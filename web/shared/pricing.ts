// Plan pricing shared by the Upgrade modal (display) and the API server
// (invoice amounts), so the browser can never choose what it gets charged.

export type Billing = 'monthly' | 'yearly'

export const PLAN_PRICES = {
  Pro: 18,
  'Pro+': 68,
  Max: 200,
} as const

export type PlanName = keyof typeof PLAN_PRICES

export const YEARLY_DISCOUNT = 0.1

export function isPlanName(value: unknown): value is PlanName {
  return typeof value === 'string' && Object.hasOwn(PLAN_PRICES, value)
}

export function isBilling(value: unknown): value is Billing {
  return value === 'monthly' || value === 'yearly'
}

/** Per-month price shown on a plan card. */
export function monthlyPrice(plan: PlanName, billing: Billing): number {
  const base = PLAN_PRICES[plan]
  return round2(billing === 'yearly' ? base * (1 - YEARLY_DISCOUNT) : base)
}

/** Amount charged up front in USD: one month, or a discounted year. */
export function chargeAmount(plan: PlanName, billing: Billing): number {
  return billing === 'yearly' ? round2(monthlyPrice(plan, billing) * 12) : PLAN_PRICES[plan]
}

export function formatUsd(value: number): string {
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
