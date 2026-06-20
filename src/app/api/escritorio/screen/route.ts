import { getSession } from '@/lib/session'
import { setScreen } from '@/lib/officeHub'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Flag whether the user is sharing their screen (so the meeting room can show it
// big in the centre of the table for everyone).
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'unauthorized' }, { status: 401 })

  let body: { sharing?: boolean }
  try { body = await req.json() } catch { return Response.json({ error: 'bad json' }, { status: 400 }) }

  setScreen(session.id, !!body.sharing)
  return Response.json({ ok: true })
}
