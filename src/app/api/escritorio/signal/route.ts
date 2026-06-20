import { getSession } from '@/lib/session'
import { signal } from '@/lib/officeHub'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Relays a WebRTC signaling message (offer/answer/ICE candidate) to one peer.
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'unauthorized' }, { status: 401 })

  let body: { to?: number; data?: unknown }
  try { body = await req.json() } catch { return Response.json({ error: 'bad json' }, { status: 400 }) }
  if (typeof body.to !== 'number') return Response.json({ error: 'no target' }, { status: 400 })

  signal(session.id, body.to, body.data)
  return Response.json({ ok: true })
}
