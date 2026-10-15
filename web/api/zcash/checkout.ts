import { checkout } from '../../server/handlers.js'

export function POST(request: Request) {
  return checkout(request)
}
