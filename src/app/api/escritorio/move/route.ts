import { getSession } from '@/lib/session'
import { upsert, OfficeStatus } from '@/lib/officeHub'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Client posts its avatar position/status; server stores it and broadcasts to the SSE stream.
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'unauthorized' }, { status: 401 })

  let body: { x?: number; y?: number; status?: string; avatarColor?: string }
  try { body = await req.json() } catch { return Response.json({ error: 'bad json' }, { status: 400 }) }

  const status: OfficeStatus =
    body.status === 'ocupado' || body.status === 'reuniao' ? body.status : 'online'

  upsert({
    id: session.id,
    name: session.name,
    role: session.role,
    avatarColor: typeof body.avatarColor === 'string' ? body.avatarColor : undefined,
    x: Number(body.x) || 0,
    y: Number(body.y) || 0,
    status,
  })

  return Response.json({ ok: true })
}
