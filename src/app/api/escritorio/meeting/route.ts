import { getSession } from '@/lib/session'
import { setMeeting } from '@/lib/officeHub'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Join / leave the meeting room (broadcast to everyone via presence).
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'unauthorized' }, { status: 401 })

  let body: { join?: boolean }
  try { body = await req.json() } catch { return Response.json({ error: 'bad json' }, { status: 400 }) }

  setMeeting(session.id, !!body.join)
  return Response.json({ ok: true })
}
