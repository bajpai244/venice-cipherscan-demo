import { invoiceStatus } from '../../../server/handlers.js'

export function GET(request: Request) {
  const id = new URL(request.url).pathname.split('/').pop() ?? ''
  return invoiceStatus(decodeURIComponent(id))
}
