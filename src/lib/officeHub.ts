// In-memory presence + chat + WebRTC-signaling hub for the virtual office.
// Singleton via globalThis so it survives HMR and is shared across route handlers
// within the Node server process. Fine for a small team (single process).

export type OfficeStatus = 'online' | 'ocupado' | 'reuniao'

export const MAX_SEATS = 8

export interface OfficePlayer {
  id: number
  name: string
  role: string
  avatarColor?: string
  x: number
  y: number
  status: OfficeStatus
  hand: boolean
  seat: number        // assigned office chair 0..7 (-1 = waiting, office full)
  meeting: boolean     // is this user currently in the meeting room
  meetingSeat: number  // assigned meeting chair 0..7 (-1 = waiting / not in meeting)
  screen: boolean      // is this user currently sharing their screen
  t: number
}

export interface ChatMsg {
  id: number
  name: string
  x: number
  y: number
  text: string
  t: number
}

type Entry = { userId: number; fn: (frame: string) => void }

interface Hub {
  players: Map<number, Omit<OfficePlayer, 'hand' | 'seat' | 'meeting' | 'meetingSeat' | 'screen'>>
  hands: Set<number>
  seats: Map<number, number>        // userId -> office seat index
  meeting: Set<number>             // userIds currently in the meeting
  meetingSeats: Map<number, number> // userId -> meeting seat index
  screens: Set<number>             // userIds currently sharing their screen
  chat: ChatMsg[]
  listeners: Set<Entry>
}

// Presence expires after this long without a sign of life. Kept comfortably above
// the SSE keep-alive ping (15s) so an open connection alone keeps a user present —
// even when their tab is backgrounded and JS timers (the POST heartbeat) throttle.
const STALE_MS = 25000
const CHAT_MAX = 40

const g = globalThis as unknown as { __officeHub?: Hub }
const hub: Hub = g.__officeHub ?? (g.__officeHub = {
  players: new Map(), hands: new Set(), seats: new Map(),
  meeting: new Set(), meetingSeats: new Map(), screens: new Set(), chat: [], listeners: new Set(),
})
// Defensive init for older singletons left over across HMR
if (!hub.chat) hub.chat = []
if (!hub.hands) hub.hands = new Set()
if (!hub.seats) hub.seats = new Map()
if (!hub.meeting) hub.meeting = new Set()
if (!hub.meetingSeats) hub.meetingSeats = new Map()
if (!hub.screens) hub.screens = new Set()

// Lowest free index in [0, MAX_SEATS) not already taken in `map`; -1 if full.
function lowestFreeSeat(map: Map<number, number>): number {
  const used = new Set(map.values())
  for (let i = 0; i < MAX_SEATS; i++) if (!used.has(i)) return i
  return -1
}

// Release everything tied to a user (called on remove / stale).
function releaseUser(id: number) {
  hub.hands.delete(id)
  hub.seats.delete(id)
  hub.meeting.delete(id)
  hub.meetingSeats.delete(id)
  hub.screens.delete(id)
}

export function snapshot(): OfficePlayer[] {
  const now = Date.now()
  const out: OfficePlayer[] = []
  for (const [id, p] of hub.players) {
    if (now - p.t > STALE_MS) { hub.players.delete(id); releaseUser(id) }
    else out.push({
      ...p,
      hand: hub.hands.has(id),
      seat: hub.seats.get(id) ?? -1,
      meeting: hub.meeting.has(id),
      meetingSeat: hub.meetingSeats.get(id) ?? -1,
      screen: hub.screens.has(id),
    })
  }
  return out
}

const presenceFrame = () => `data: ${JSON.stringify(snapshot())}\n\n`
const chatFrame = (m: ChatMsg) => `event: chat\ndata: ${JSON.stringify(m)}\n\n`
const signalFrame = (from: number, data: unknown) => `event: signal\ndata: ${JSON.stringify({ from, data })}\n\n`

const emit = (frame: string) => { for (const e of hub.listeners) e.fn(frame) }

export function broadcast() { emit(presenceFrame()) }

export function upsert(p: Omit<OfficePlayer, 't' | 'hand' | 'seat' | 'meeting' | 'meetingSeat' | 'screen'>) {
  hub.players.set(p.id, { ...p, t: Date.now() })
  // Assign a stable office chair on first sight (kept while the user stays online).
  if (!hub.seats.has(p.id)) hub.seats.set(p.id, lowestFreeSeat(hub.seats))
  broadcast()
}

export function remove(id: number) {
  releaseUser(id)
  if (hub.players.delete(id)) broadcast()
}

// Keep a user from going stale while their SSE connection is alive (called by the
// stream's keep-alive ping). Does not broadcast — just refreshes the timestamp.
export function touch(id: number) {
  const p = hub.players.get(id)
  if (p) p.t = Date.now()
}

export function setHand(id: number, raised: boolean) {
  if (raised) hub.hands.add(id); else hub.hands.delete(id)
  broadcast()
}

// Join/leave the meeting room. Joining grabs the lowest free meeting chair.
export function setMeeting(id: number, join: boolean) {
  if (join) {
    hub.meeting.add(id)
    if (!hub.meetingSeats.has(id)) hub.meetingSeats.set(id, lowestFreeSeat(hub.meetingSeats))
  } else {
    hub.meeting.delete(id)
    hub.meetingSeats.delete(id)
    hub.screens.delete(id) // leaving the room also stops any screen share
  }
  broadcast()
}

// Start/stop sharing the screen (shown big on the meeting table).
export function setScreen(id: number, sharing: boolean) {
  if (sharing) hub.screens.add(id); else hub.screens.delete(id)
  broadcast()
}

export function postChat(m: Omit<ChatMsg, 't'>): ChatMsg {
  const msg = { ...m, t: Date.now() }
  hub.chat.push(msg)
  if (hub.chat.length > CHAT_MAX) hub.chat.shift()
  emit(chatFrame(msg))
  return msg
}

// Relay a WebRTC signaling message (offer/answer/ICE) to one specific user.
export function signal(from: number, to: number, data: unknown) {
  const frame = signalFrame(from, data)
  for (const e of hub.listeners) if (e.userId === to) e.fn(frame)
}

export function subscribe(userId: number, fn: (frame: string) => void): () => void {
  const entry: Entry = { userId, fn }
  hub.listeners.add(entry)
  return () => hub.listeners.delete(entry)
}

export function initialFrames(): string {
  const now = Date.now()
  const recent = hub.chat.filter(m => now - m.t < 60000)
  return presenceFrame() + recent.map(chatFrame).join('')
}
