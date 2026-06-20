import { getSession } from '@/lib/session'
import { subscribe, remove, initialFrames } from '@/lib/officeHub'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Server-Sent Events stream: pushes presence snapshots (default event) and chat
// messages (named "chat" event) whenever anyone moves or speaks.
export async function GET() {
  const session = await getSession()
  if (!session) return new Response('unauthorized', { status: 401 })

  const enc = new TextEncoder()
  let unsub = () => {}
  let ping: ReturnType<typeof setInterval>

  const stream = new ReadableStream({
    start(controller) {
      const send = (frame: string) => {
        try { controller.enqueue(enc.encode(frame)) } catch {}
      }
      send(initialFrames())
      unsub = subscribe(session.id, send)
      // keep-alive comment so proxies don't drop the idle connection
      ping = setInterval(() => {
        try { controller.enqueue(enc.encode(`: ping\n\n`)) } catch {}
      }, 15000)
    },
    cancel() {
      clearInterval(ping)
      unsub()
      remove(session.id) // drop presence when the tab closes
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}
