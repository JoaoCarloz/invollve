import { getSession } from '@/lib/session'
import { setHand } from '@/lib/officeHub'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Raise / lower the user's hand (broadcast to everyone via presence).
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'unauthorized' }, { status: 401 })

  let body: { raised?: boolean }
  try { body = await req.json() } catch { return Response.json({ error: 'bad json' }, { status: 400 }) }

  setHand(session.id, !!body.raised)
  return Response.json({ ok: true })
}
