'use client'
import { useEffect, useState } from 'react'
import { UserSession } from '@/lib/auth'
import { updateNearby } from '@/lib/officeProximity'
import { useCall, CallControls, SelfView, RemoteVideo } from './OfficeCall'

/*
 * Top-down "meeting room from above" view (shown only while the local user is in
 * the meeting). A clean, minimal room seen from the ceiling: a rug, a table in
 * the centre, and 8 chairs around it. Each participant is a round video/avatar
 * bubble sitting in their assigned chair (meetingSeat). When someone shares their
 * screen, it appears LARGE in the middle of the table so everyone sees it well.
 * Voice/video come from the shared CallProvider (same WebRTC mesh as the office).
 */

const ROLE_SHIRT: Record<string, string> = {
  socio: '#f0a23a', gestor_trafego: '#4f8de8', social_media: '#e8804f', designer: '#b06fd0', staff: '#7a8290',
}

type Out = 'up' | 'down' | 'left' | 'right'
// 8 chairs around the central table — index = meetingSeat. `out` points away from
// the table (where the chair's backrest goes).
const SEATS: { x: number; y: number; out: Out }[] = [
  { x: 34, y: 18, out: 'up' }, { x: 50, y: 15, out: 'up' }, { x: 66, y: 18, out: 'up' },
  { x: 14, y: 50, out: 'left' }, { x: 86, y: 50, out: 'right' },
  { x: 34, y: 82, out: 'down' }, { x: 50, y: 85, out: 'down' }, { x: 66, y: 82, out: 'down' },
]

type Participant = {
  id: number; name: string; role: string; avatarColor?: string
  hand: boolean; meetingSeat: number; screen: boolean
}

function initialsOf(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

/* A simple top-down chair: a soft seat pad with a backrest bar on the outer side. */
function Chair({ out, dim, children }: { out: Out; dim?: boolean; children?: React.ReactNode }) {
  const back: Record<Out, string> = {
    up: 'top-[-9px] left-1/2 -translate-x-1/2 w-[78px] h-[18px]',
    down: 'bottom-[-9px] left-1/2 -translate-x-1/2 w-[78px] h-[18px]',
    left: 'left-[-9px] top-1/2 -translate-y-1/2 w-[18px] h-[78px]',
    right: 'right-[-9px] top-1/2 -translate-y-1/2 w-[18px] h-[78px]',
  }
  return (
    <div className={`relative ${dim ? 'opacity-70' : ''}`}>
      <div className={`absolute ${back[out]} rounded-full bg-[#4c453d]`} />
      <div className="relative w-[104px] h-[104px] rounded-[28px] bg-[#5c544b] shadow-[0_12px_22px_rgba(0,0,0,0.28)] flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}

export default function MeetingRoom({ session, avatarColor, onLeave }: { session: UserSession; avatarColor: string; onLeave: () => void }) {
  const meId = session.id
  const { micOn, camOn, screenOn } = useCall()
  const [participants, setParticipants] = useState<Participant[]>([])

  // Presence: who is in the meeting + their assigned chair + who is sharing screen.
  useEffect(() => {
    const es = new EventSource('/api/escritorio/stream')
    es.onmessage = (e) => {
      try {
        const arr = JSON.parse(e.data) as (Participant & { meeting: boolean; t: number })[]
        const now = Date.now()
        setParticipants(arr.filter(p => p.meeting && now - p.t < 12000))
      } catch {}
    }
    return () => es.close()
  }, [])

  // Connect A/V to every other person in the meeting while this view is mounted.
  useEffect(() => {
    updateNearby(new Set(participants.filter(p => p.id !== meId).map(p => p.id)))
  }, [participants, meId])

  const bySeat = new Map<number, Participant>()
  participants.forEach(p => { if (p.meetingSeat >= 0 && p.meetingSeat < SEATS.length) bySeat.set(p.meetingSeat, p) })
  const waiting = participants.filter(p => p.meetingSeat < 0 || p.meetingSeat >= SEATS.length).length
  const sharer = participants.find(p => p.screen) ?? null

  return (
    <div className="absolute inset-0 z-40 flex flex-col"
      style={{ background: 'radial-gradient(120% 120% at 50% 45%, #edeae3 0%, #ddd9d0 55%, #c9c4b9 100%)' }}>
      {/* header */}
      <div className="relative z-10 flex items-center justify-between px-5 py-3 flex-shrink-0">
        <div className="flex items-center gap-2 text-zinc-700">
          <span className="text-lg">📹</span>
          <span className="font-semibold">Sala de Reunião</span>
          <span className="text-xs text-zinc-500 ml-1">{participants.length} {participants.length === 1 ? 'pessoa' : 'pessoas'}</span>
        </div>
        {waiting > 0 && <span className="text-xs text-amber-600">{waiting} aguardando lugar</span>}
      </div>

      {/* top-down room stage */}
      <div className="relative z-10 flex-1 mx-auto w-full max-w-[1180px] overflow-hidden">
        {/* The room (rug + table + chairs). When a screen is shared the whole room
            zooms in a touch so the shared screen — and the cameras around it — get
            bigger and easier to read. Chairs move with the zoom, cameras follow. */}
        <div className="absolute inset-0 transition-transform duration-500 ease-out"
          style={{ transform: sharer ? 'scale(1.16)' : 'scale(1)', transformOrigin: '50% 49%' }}>
          {/* rug defining the seating area */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[60px]"
            style={{ width: '82%', height: '88%', background: 'radial-gradient(130% 130% at 50% 45%, #e4e0d7, #d2cdc2)', boxShadow: 'inset 0 0 60px rgba(0,0,0,0.04)' }} />

          {/* the table */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[44px]"
            style={{ width: '46%', height: '48%', background: 'linear-gradient(160deg,#c2a984 0%,#a98e66 60%,#977c54 100%)', boxShadow: '0 30px 60px rgba(60,45,25,0.35), inset 0 2px 0 rgba(255,255,255,0.25)' }}>
            <div className="absolute inset-[10px] rounded-[34px]" style={{ boxShadow: 'inset 0 0 40px rgba(120,90,50,0.35)' }} />

            {/* shared screen, large, in the middle of the table */}
            {sharer && (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl overflow-hidden bg-black shadow-2xl ring-1 ring-black/40"
                style={{ width: '83%', height: '80%' }}>
                {sharer.id === meId
                  ? <SelfView mirror={false} className="w-full h-full object-contain bg-black" />
                  : <RemoteVideo id={sharer.id} className="w-full h-full object-contain bg-black" />}
                <span className="absolute bottom-1.5 left-1.5 text-[11px] text-white bg-black/60 px-2 py-0.5 rounded">
                  🖥️ Tela de {sharer.name.split(' ')[0]}
                </span>
              </div>
            )}
          </div>

          {/* chairs + participant bubbles around the table */}
          {SEATS.map((seat, i) => {
            const p = bySeat.get(i)
            const isMe = p?.id === meId
            const color = p ? (p.avatarColor ?? ROLE_SHIRT[p.role] ?? '#7a8290') : ''
            // Show the seat's camera only when it's a real camera (not while that
            // person is screen-sharing — their screen goes to the centre instead).
            const seatVideo = p && !p.screen && (isMe ? (camOn && !screenOn) : true)
            return (
              <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5"
                style={{ left: `${seat.x}%`, top: `${seat.y}%` }}>
                <Chair out={seat.out} dim={!p}>
                  {p && (
                    <div className="relative w-[92px] h-[92px] rounded-full overflow-hidden ring-2 ring-white/70 shadow-lg">
                      <div className="absolute inset-0 flex items-center justify-center"
                        style={{ background: `radial-gradient(circle at 50% 38%, ${color}, ${color}bb 70%)` }}>
                        <span className="text-2xl font-bold text-white drop-shadow">{initialsOf(p.name)}</span>
                      </div>
                      {seatVideo && (isMe
                        ? <SelfView className="absolute inset-0 w-full h-full object-cover" />
                        : <RemoteVideo id={p.id} className="absolute inset-0 w-full h-full object-cover" />)}
                      {p.hand && <span className="absolute -top-0.5 right-0.5 text-base drop-shadow">✋</span>}
                    </div>
                  )}
                </Chair>
                {p && (
                  <span className="px-2 py-0.5 rounded-full bg-white/85 text-zinc-700 text-[11px] font-medium shadow flex items-center gap-1 whitespace-nowrap">
                    {(isMe && !micOn) && <span title="Microfone desligado">🔇</span>}
                    {p.name.split(' ')[0]}{isMe ? ' (você)' : ''}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* When sharing: dim the surroundings to spotlight the table + screen
            (everything stays visible, just darker around the focus). */}
        <div className="absolute inset-0 pointer-events-none transition-opacity duration-500"
          style={{ opacity: sharer ? 1 : 0, background: 'radial-gradient(60% 74% at 50% 49%, transparent 48%, rgba(8,6,16,0.62) 100%)' }} />
      </div>

      {/* controls */}
      <div className="relative z-10 flex-shrink-0 flex justify-center pb-5 pt-2">
        <CallControls
          variant="meeting"
          extra={
            <button onClick={onLeave} title="Sair da reunião"
              className="ml-1 h-11 px-4 rounded-full flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all">
              Sair
            </button>
          }
        />
      </div>
    </div>
  )
}
