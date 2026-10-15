import { webhook } from '../../server/handlers.js'

export function POST(request: Request) {
  return webhook(request)
}
