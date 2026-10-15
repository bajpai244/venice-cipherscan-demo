import { useCallback, useEffect, useState } from 'react'
import { Bitcoin, Check, ChevronDown, X } from 'lucide-react'
import { CoinbaseIcon, StripeIcon, ZcashIcon } from './CryptoIcons'
import ZcashCheckout, { type CheckoutRequest } from './ZcashCheckout'
import { formatUsd, monthlyPrice, type Billing, type PlanName } from '../shared/pricing.ts'

const ZCASH_OPTION = 'Zcash (CipherPay)'

const CRYPTO_OPTIONS = [
  { label: 'Bitcoin (BTCPay)', icon: () => <Bitcoin size={16} strokeWidth={1.8} /> },
  { label: 'USDC (Coinbase)', icon: () => <CoinbaseIcon /> },
  { label: 'USDC (Stripe)', icon: () => <StripeIcon /> },
  { label: ZCASH_OPTION, icon: () => <ZcashIcon /> },
]

const PLANS: { name: PlanName; popular?: boolean; blurb: string; features: string[] }[] = [
  {
    name: 'Pro',
    blurb: 'Your private AI studio — every model, every medium, no limits.',
    features: [
      'All Pro models access',
      'Unlimited text prompts and 1,000 images per day',
      'Web scraping',
      'Generate video, music, and use frontier image and text models with credits',
      'Image superpowers: upscale, remove backgrounds, create variants, and more',
      'Create and share custom characters',
      'Extended context windows for deep work and longer running conversations',
      'Encrypted chat backup and restore',
      '100 credits / month for video, music, premium models, and API',
    ],
  },
  {
    name: 'Pro+',
    popular: true,
    blurb: 'Everything in Pro, scaled for serious creators and users',
    features: [
      'Everything in Pro',
      'Higher image generation limits on Venice Pro models',
      '7,500 credits / month for video, music, frontier image generation, LLMs and API',
      '2-month credit banking — unused credits roll forward',
    ],
  },
  {
    name: 'Max',
    blurb: 'Everything in Pro — For the ultimate access for Venice power-users',
    features: [
      'Everything in Pro+',
      'Highest image generation limits on Venice Pro models',
      '22,500 credits / month for video, music, frontier image generation, frontier LLMs and API',
      '3-month credit banking',
    ],
  },
]

export default function UpgradeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [billing, setBilling] = useState<Billing>('monthly')
  const [cryptoFor, setCryptoFor] = useState<string | null>(null)
  const [checkout, setCheckout] = useState<CheckoutRequest | null>(null)
  const closeCheckout = useCallback(() => setCheckout(null), [])
  const finishCheckout = useCallback(() => {
    setCheckout(null)
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) setCryptoFor(null)
  }, [open])

  useEffect(() => {
    if (!open || checkout) return
    // Escape closes an open crypto dropdown first, then the modal.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (cryptoFor) setCryptoFor(null)
      else onClose()
    }
    const onPointer = (e: PointerEvent) => {
      if (cryptoFor && !(e.target as Element).closest('.crypto-wrap')) setCryptoFor(null)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open, onClose, cryptoFor, checkout])

  return (
    <>
      <div
        className={`modal-overlay ${open ? 'open' : ''}`}
        aria-hidden={!open}
        onPointerDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="upgrade" role="dialog" aria-modal="true" aria-labelledby="upgrade-title">
          <button className="modal-close" aria-label="Close" onClick={onClose}>
            <X size={22} strokeWidth={1.8} />
          </button>

          <h2 id="upgrade-title">Upgrade Your Plan</h2>

          <div className="billing-toggle" role="tablist">
            <button
              role="tab"
              aria-selected={billing === 'monthly'}
              className={billing === 'monthly' ? 'active' : ''}
              onClick={() => setBilling('monthly')}
            >
              Monthly
            </button>
            <button
              role="tab"
              aria-selected={billing === 'yearly'}
              className={billing === 'yearly' ? 'active' : ''}
              onClick={() => setBilling('yearly')}
            >
              Yearly <span className="save-badge">Save 10%</span>
            </button>
          </div>

          <div className="plans">
            {PLANS.map((plan) => (
              <article className="plan" key={plan.name}>
                <header>
                  <h3>{plan.name}</h3>
                  {plan.popular && <span className="popular">Most Popular</span>}
                </header>
                <div className="plan-price">
                  <strong>{formatUsd(monthlyPrice(plan.name, billing))}</strong>
                  <span>/mo</span>
                  {billing === 'yearly' && <span className="billed">billed yearly</span>}
                </div>
                <p className="plan-blurb">{plan.blurb}</p>
                <button className="plan-cta">Get {plan.name}</button>
                <div className="crypto-wrap">
                  <button
                    className={`plan-crypto ${cryptoFor === plan.name ? 'active' : ''}`}
                    aria-haspopup="menu"
                    aria-expanded={cryptoFor === plan.name}
                    onClick={() => setCryptoFor((p) => (p === plan.name ? null : plan.name))}
                  >
                    Pay with Crypto <ChevronDown size={15} strokeWidth={2} />
                  </button>
                  <div
                    className={`crypto-menu ${cryptoFor === plan.name ? 'open' : ''}`}
                    role="menu"
                    aria-hidden={cryptoFor !== plan.name}
                  >
                    {CRYPTO_OPTIONS.map(({ label, icon: Icon }) => (
                      <button
                        key={label}
                        role="menuitem"
                        tabIndex={cryptoFor === plan.name ? 0 : -1}
                        className="crypto-option"
                        onClick={() => {
                          setCryptoFor(null)
                          if (label === ZCASH_OPTION) setCheckout({ plan: plan.name, billing })
                        }}
                      >
                        <Icon />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <ul className="plan-features">
                  {plan.features.map((f) => (
                    <li key={f}>
                      <Check size={14} strokeWidth={2} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </div>
      <ZcashCheckout request={checkout} onClose={closeCheckout} onDone={finishCheckout} />
    </>
  )
}
