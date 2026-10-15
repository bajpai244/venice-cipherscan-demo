import http from 'node:http'
import { apiUrl } from './cipherpay.js'
import { store } from './store.js'
import { checkout, health, invoiceStatus, warnMissingConfig, webhook } from './handlers.js'

// Local development server for the same handlers that run as Vercel functions
// in api/. Vite proxies /api here; ngrok can expose it for webhooks.

const PORT = Number(process.env.PORT) || 8787

async function route(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url)
  if (request.method === 'GET' && pathname === '/api/health') return health()
  if (request.method === 'POST' && pathname === '/api/zcash/checkout') return checkout(request)
  if (request.method === 'POST' && pathname === '/api/webhooks/cipherpay') return webhook(request)
  const match = pathname.match(/^\/api\/zcash\/invoices\/([^/]+)$/)
  if (request.method === 'GET' && match) return invoiceStatus(decodeURIComponent(match[1]))
  return new Response('Not found', { status: 404 })
}

http
  .createServer(async (req, res) => {
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk as Buffer)
    const body = chunks.length ? Buffer.concat(chunks) : undefined
    const headers = new Headers()
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') headers.set(key, value)
      else if (Array.isArray(value)) for (const v of value) headers.append(key, v)
    }
    const request = new Request(`http://localhost${req.url}`, {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
    })

    let response: Response
    try {
      response = await route(request)
    } catch (err) {
      console.error('[api] unhandled error:', err)
      response = new Response('Internal error', { status: 500 })
    }
    res.writeHead(response.status, Object.fromEntries(response.headers))
    res.end(Buffer.from(await response.arrayBuffer()))
  })
  .listen(PORT, () => {
    console.log(`[api] listening on http://localhost:${PORT} (CipherPay: ${apiUrl}, store: ${store.kind})`)
    warnMissingConfig()
  })
