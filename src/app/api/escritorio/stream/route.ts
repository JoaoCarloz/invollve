import { getSession } from '@/lib/session'
import { subscribe, initialFrames, touch } from '@/lib/officeHub'

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
      // keep-alive comment so proxies don't drop the idle connection; it also
      // refreshes presence so an open tab stays "present" even if its JS heartbeat
      // is throttled (backgrounded tab).
      ping = setInterval(() => {
        touch(session.id)
        try { controller.enqueue(enc.encode(`: ping\n\n`)) } catch {}
      }, 15000)
    },
    cancel() {
      clearInterval(ping)
      unsub()
      // NOTE: we intentionally do NOT remove presence here. A user holds several
      // SSE connections at once (voice + the office/meeting view), and switching
      // views closes one of them — removing on any close would wipe the user's
      // seat and meeting membership mid-session. Presence is kept alive by the
      // 3s heartbeat (POST /move) and pruned automatically after STALE_MS once a
      // tab really closes and the heartbeat stops.
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
