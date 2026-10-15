import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { AlertTriangle, Check, Clock, Copy, RotateCw, X } from 'lucide-react'
import { ZcashIcon } from './CryptoIcons'
import { formatUsd, type Billing, type PlanName } from '../shared/pricing.ts'

export type CheckoutRequest = { plan: PlanName; billing: Billing }

type Invoice = {
  invoiceId: string
  memoCode: string
  priceZec: number
  paymentAddress: string
  zcashUri: string
  expiresAt: string
  amountUsd: number
}

type Status = 'pending' | 'underpaid' | 'detected' | 'confirmed' | 'expired'

type InvoiceState = {
  status: Status
  receivedZec: number | null
  txid: string | null
}

type Phase =
  | { kind: 'creating' }
  | { kind: 'error'; message: string }
  | { kind: 'invoice'; invoice: Invoice; qr: string; state: InvoiceState }

const POLL_MS = 2000

function formatZec(value: number) {
  return value.toFixed(8).replace(/\.?0+$/, '')
}

function shorten(value: string, head = 10, tail = 8) {
  return value.length > head + tail + 1 ? `${value.slice(0, head)}…${value.slice(-tail)}` : value
}

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(total / 60)}m ${String(total % 60).padStart(2, '0')}s`
}

export default function ZcashCheckout({
  request,
  onClose,
  onDone,
}: {
  request: CheckoutRequest | null
  onClose: () => void
  onDone: () => void
}) {
  // Keep the last request around so the dialog can animate out with content.
  const [shown, setShown] = useState<CheckoutRequest | null>(request)
  const [phase, setPhase] = useState<Phase>({ kind: 'creating' })
  const [attempt, setAttempt] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [copied, setCopied] = useState(false)
  const open = request !== null

  if (request && request !== shown) setShown(request)

  // Create a fresh invoice whenever the checkout opens or the user retries.
  useEffect(() => {
    if (!request) return
    let cancelled = false
    setPhase({ kind: 'creating' })
    ;(async () => {
      try {
        const res = await fetch('/api/zcash/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error || `Checkout failed (${res.status})`)
        const invoice = body as Invoice
        const qr = await QRCode.toDataURL(invoice.zcashUri, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 440,
          color: { dark: '#0b0d10', light: '#ffffff' },
        })
        if (!cancelled) {
          setPhase({
            kind: 'invoice',
            invoice,
            qr,
            state: { status: 'pending', receivedZec: null, txid: null },
          })
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Something went wrong'
          setPhase({ kind: 'error', message })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [request, attempt])

  // Poll our backend, which is kept current by CipherPay's signed webhooks.
  const invoiceId = phase.kind === 'invoice' ? phase.invoice.invoiceId : null
  const settled =
    phase.kind === 'invoice' && (phase.state.status === 'confirmed' || phase.state.status === 'expired')
  useEffect(() => {
    if (!invoiceId || settled || !open) return
    let cancelled = false
    const tick = async () => {
      try {
        const res = await fetch(`/api/zcash/invoices/${invoiceId}`)
        if (!res.ok) return
        const data = (await res.json()) as InvoiceState
        if (cancelled) return
        setPhase((p) =>
          p.kind === 'invoice' && p.invoice.invoiceId === invoiceId
            ? { ...p, state: { status: data.status, receivedZec: data.receivedZec, txid: data.txid } }
            : p,
        )
      } catch {
        // Transient network error; the next tick retries.
      }
    }
    const timer = setInterval(tick, POLL_MS)
    tick()
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [invoiceId, settled, open])

  // Countdown clock while waiting for payment.
  useEffect(() => {
    if (!open || phase.kind !== 'invoice' || settled) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [open, phase.kind, settled])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      onClose()
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open, onClose])

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard unavailable (e.g. insecure context); nothing to do.
    }
  }

  const retry = () => setAttempt((a) => a + 1)
  const planLabel = shown ? `Venice ${shown.plan}` : ''
  const billingLabel = shown?.billing === 'yearly' ? 'Yearly' : 'Monthly'

  let body: React.ReactNode
  if (phase.kind === 'creating') {
    body = (
      <div className="zc-center">
        <span className="zc-spinner" />
        <p className="zc-muted">Creating a shielded invoice…</p>
      </div>
    )
  } else if (phase.kind === 'error') {
    body = (
      <div className="zc-center">
        <span className="zc-badge warn">
          <AlertTriangle size={22} strokeWidth={1.8} />
        </span>
        <h3>Couldn't start the payment</h3>
        <p className="zc-muted">{phase.message}</p>
        <button className="zc-primary" onClick={retry}>
          <RotateCw size={15} strokeWidth={2} /> Try again
        </button>
      </div>
    )
  } else {
    const { invoice, qr, state } = phase
    const remaining = Date.parse(invoice.expiresAt) - now
    const expired = state.status === 'expired' || (state.status === 'pending' && remaining <= 0)

    if (state.status === 'confirmed') {
      body = (
        <div className="zc-success">
          <span className="zc-check">
            <Check size={34} strokeWidth={2.4} />
          </span>
          <h3>Your subscription is complete</h3>
          <p className="zc-muted">
            Welcome to {planLabel}. Your plan is active and ready to use.
          </p>
          <dl className="zc-receipt">
            <div>
              <dt>Plan</dt>
              <dd>
                {planLabel} · {billingLabel}
              </dd>
            </div>
            <div>
              <dt>Paid</dt>
              <dd>
                {formatZec(state.receivedZec ?? invoice.priceZec)} ZEC
                <span className="zc-muted"> ({formatUsd(invoice.amountUsd)})</span>
              </dd>
            </div>
            <div>
              <dt>Reference</dt>
              <dd className="zc-mono">{invoice.memoCode}</dd>
            </div>
            {state.txid && (
              <div>
                <dt>Transaction</dt>
                <dd className="zc-mono">{shorten(state.txid, 8, 8)}</dd>
              </div>
            )}
          </dl>
          <p className="zc-private">Paid privately with shielded Zcash</p>
          <button className="zc-primary wide" onClick={onDone}>
            Start creating
          </button>
        </div>
      )
    } else if (expired) {
      body = (
        <div className="zc-center">
          <span className="zc-badge">
            <Clock size={22} strokeWidth={1.8} />
          </span>
          <h3>This invoice expired</h3>
          <p className="zc-muted">No payment arrived in time. Create a new invoice to try again.</p>
          <button className="zc-primary" onClick={retry}>
            <RotateCw size={15} strokeWidth={2} /> New invoice
          </button>
        </div>
      )
    } else if (state.status === 'detected') {
      body = (
        <div className="zc-center">
          <span className="zc-spinner large" />
          <h3>Payment detected</h3>
          <p className="zc-muted">
            Waiting for the transaction to be confirmed in a block. This usually takes about a minute.
          </p>
          <div className="zc-progress">
            <span />
          </div>
          {state.txid && <p className="zc-mono zc-muted small">tx {shorten(state.txid, 10, 10)}</p>}
        </div>
      )
    } else {
      body = (
        <>
          {state.status === 'underpaid' && (
            <div className="zc-alert">
              <AlertTriangle size={15} strokeWidth={2} />
              <span>
                Received {formatZec(state.receivedZec ?? 0)} of {formatZec(invoice.priceZec)} ZEC. Send the
                remaining amount to the same address.
              </span>
            </div>
          )}
          <div className="zc-qr">
            <img src={qr} alt="Zcash payment QR code" />
          </div>
          <div className="zc-amount-card">
            <strong>{invoice.amountUsd.toFixed(2)} USD</strong>
            <span className="zc-mono">{invoice.priceZec.toFixed(8)} ZEC</span>
          </div>
          <dl className="zc-details">
            <div>
              <dt>Memo code</dt>
              <dd className="zc-mono">{invoice.memoCode}</dd>
            </div>
            <div>
              <dt>Recipient</dt>
              <dd>
                <button
                  className="zc-copy zc-mono"
                  title="Copy address"
                  onClick={() => copyAddress(invoice.paymentAddress)}
                >
                  {shorten(invoice.paymentAddress, 8, 6)}
                  {copied ? <Check size={13} strokeWidth={2.2} /> : <Copy size={13} strokeWidth={1.8} />}
                </button>
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd className="zc-state">
                <span className="zc-dot" />
                {state.status === 'underpaid' ? 'Partially paid' : 'Awaiting payment'}
              </dd>
            </div>
            <div>
              <dt>Expires in</dt>
              <dd className="zc-countdown">{formatCountdown(remaining)}</dd>
            </div>
          </dl>
          <a className="zc-pay" href={invoice.zcashUri}>
            Pay {invoice.priceZec.toFixed(8)} ZEC
          </a>
          <p className="zc-hint">
            Payment is shielded. CipherPay sees the on-chain transaction but not your wallet.
          </p>
        </>
      )
    }
  }

  return (
    <div
      className={`zc-overlay ${open ? 'open' : ''}`}
      aria-hidden={!open}
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="zc-dialog" role="dialog" aria-modal="true" aria-labelledby="zc-title">
        <header className="zc-header">
          <span className="zc-logo">
            <ZcashIcon size={18} />
          </span>
          <div>
            <h2 id="zc-title">Pay with Zcash</h2>
            <p className="zc-muted">
              {planLabel} · {billingLabel}
            </p>
          </div>
          <button className="zc-close" aria-label="Close" onClick={onClose}>
            <X size={18} strokeWidth={1.8} />
          </button>
        </header>
        <div className="zc-body" key={phase.kind === 'invoice' ? phase.state.status : phase.kind}>
          {body}
        </div>
        <footer className="zc-footer">Shielded payment powered by CipherPay</footer>
      </div>
    </div>
  )
}
