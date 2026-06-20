import { getSession } from '@/lib/session'
import { postChat } from '@/lib/officeHub'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Client posts a chat message (with its current position for proximity filtering).
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'unauthorized' }, { status: 401 })

  let body: { text?: string; x?: number; y?: number }
  try { body = await req.json() } catch { return Response.json({ error: 'bad json' }, { status: 400 }) }

  const text = (body.text ?? '').toString().trim().slice(0, 280)
  if (!text) return Response.json({ error: 'empty' }, { status: 400 })

  postChat({
    id: session.id,
    name: session.name,
    x: Number(body.x) || 0,
    y: Number(body.y) || 0,
    text,
  })

  return Response.json({ ok: true })
}
