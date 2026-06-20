// In-memory presence + chat + WebRTC-signaling hub for the virtual office.
// Singleton via globalThis so it survives HMR and is shared across route handlers
// within the Node server process. Fine for a small team (single process).

export type OfficeStatus = 'online' | 'ocupado' | 'reuniao'

export interface OfficePlayer {
  id: number
  name: string
  role: string
  avatarColor?: string
  x: number
  y: number
  status: OfficeStatus
  hand: boolean
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
  players: Map<number, Omit<OfficePlayer, 'hand'>>
  hands: Set<number>
  chat: ChatMsg[]
  listeners: Set<Entry>
}

const STALE_MS = 12000
const CHAT_MAX = 40

const g = globalThis as unknown as { __officeHub?: Hub }
const hub: Hub = g.__officeHub ?? (g.__officeHub = { players: new Map(), hands: new Set(), chat: [], listeners: new Set() })
if (!hub.chat) hub.chat = []
if (!hub.hands) hub.hands = new Set()

export function snapshot(): OfficePlayer[] {
  const now = Date.now()
  const out: OfficePlayer[] = []
  for (const [id, p] of hub.players) {
    if (now - p.t > STALE_MS) { hub.players.delete(id); hub.hands.delete(id) }
    else out.push({ ...p, hand: hub.hands.has(id) })
  }
  return out
}

const presenceFrame = () => `data: ${JSON.stringify(snapshot())}\n\n`
const chatFrame = (m: ChatMsg) => `event: chat\ndata: ${JSON.stringify(m)}\n\n`
const signalFrame = (from: number, data: unknown) => `event: signal\ndata: ${JSON.stringify({ from, data })}\n\n`

const emit = (frame: string) => { for (const e of hub.listeners) e.fn(frame) }

export function broadcast() { emit(presenceFrame()) }

export function upsert(p: Omit<OfficePlayer, 't' | 'hand'>) {
  hub.players.set(p.id, { ...p, t: Date.now() })
  broadcast()
}

export function remove(id: number) {
  hub.hands.delete(id)
  if (hub.players.delete(id)) broadcast()
}

export function setHand(id: number, raised: boolean) {
  if (raised) hub.hands.add(id); else hub.hands.delete(id)
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
