'use client'
import { useEffect, useRef, useState } from 'react'
import { UserSession } from '@/lib/auth'
import { updateNearby } from '@/lib/officeProximity'
import { useCall, CallControls, SelfView, RemoteVideo } from './OfficeCall'

/*
 * Full-screen "Google Meet"-style meeting room.
 *
 * Shown only while the local user is in the meeting. Renders a big table with 8
 * fixed chairs around it; each participant sits in the chair the server assigned
 * (meetingSeat). When someone turns their camera on, the video fills THEIR chair
 * tile — as if the person were sitting there. Voice/screen come from the shared
 * CallProvider (same WebRTC mesh as the office). While mounted, it connects A/V
 * to everyone in the meeting (regardless of office proximity).
 */

const ROLE_SHIRT: Record<string, string> = {
  socio: '#f0a23a', gestor_trafego: '#4f8de8', social_media: '#e8804f', designer: '#b06fd0', staff: '#7a8290',
}

// 8 chairs around the table: 3 top, 1 each side, 3 bottom (percentages of the stage).
const SEAT_POS = [
  { left: 30, top: 12 }, { left: 50, top: 8 },  { left: 70, top: 12 },
  { left: 9,  top: 50 },                          { left: 91, top: 50 },
  { left: 30, top: 88 }, { left: 50, top: 92 }, { left: 70, top: 88 },
]

type Participant = {
  id: number; name: string; role: string; avatarColor?: string
  hand: boolean; meetingSeat: number
}

function initialsOf(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export default function MeetingRoom({ session, avatarColor, onLeave }: { session: UserSession; avatarColor: string; onLeave: () => void }) {
  const meId = session.id
  const { micOn, showSelf } = useCall()
  const [participants, setParticipants] = useState<Participant[]>([])

  // Presence: who is in the meeting + their assigned chair.
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
  participants.forEach(p => { if (p.meetingSeat >= 0 && p.meetingSeat < SEAT_POS.length) bySeat.set(p.meetingSeat, p) })
  const waiting = participants.filter(p => p.meetingSeat < 0 || p.meetingSeat >= SEAT_POS.length).length

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-gradient-to-b from-[#0b1220] to-[#070a12]">
      {/* header */}
      <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
        <div className="flex items-center gap-2 text-white">
          <span className="text-lg">📹</span>
          <span className="font-semibold">Sala de Reunião</span>
          <span className="text-xs text-zinc-400 ml-1">{participants.length} {participants.length === 1 ? 'pessoa' : 'pessoas'}</span>
        </div>
        {waiting > 0 && <span className="text-xs text-amber-300">{waiting} aguardando lugar</span>}
      </div>

      {/* stage with table + chairs */}
      <div className="relative flex-1 mx-auto w-full max-w-[1100px]">
        {/* big meeting table */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[80px] bg-gradient-to-br from-[#caa06a] to-[#9c7748] shadow-2xl border border-black/20"
          style={{ width: '52%', height: '46%' }}>
          <div className="absolute inset-3 rounded-[64px] bg-[#d8ab74]/40" />
        </div>

        {/* 8 chair slots */}
        {SEAT_POS.map((pos, i) => {
          const p = bySeat.get(i)
          const isMe = p?.id === meId
          const color = p ? (p.avatarColor ?? ROLE_SHIRT[p.role] ?? '#7a8290') : ''
          return (
            <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${pos.left}%`, top: `${pos.top}%` }}>
              {!p ? (
                <div className="w-[120px] h-[90px] rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center text-white/15 text-xs">
                  vazio
                </div>
              ) : (
                <div className="relative w-[150px] h-[112px] rounded-2xl overflow-hidden border border-white/15 bg-[#0f1420] shadow-xl">
                  {/* avatar fallback (behind any video) */}
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: `radial-gradient(circle at 50% 35%, ${color}33, #0f1420 70%)` }}>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg" style={{ background: color }}>
                      {initialsOf(p.name)}
                    </div>
                  </div>
                  {/* video on top (hidden by the component until live) */}
                  {isMe
                    ? (showSelf && <SelfView className="absolute inset-0 w-full h-full object-cover" />)
                    : <RemoteVideo id={p.id} className="absolute inset-0 w-full h-full object-cover" />}
                  {/* name + indicators */}
                  <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
                    <span className="text-[11px] text-white bg-black/60 px-1.5 py-0.5 rounded truncate max-w-[80%]">
                      {p.name.split(' ')[0]}{isMe ? ' (você)' : ''}
                    </span>
                    {isMe && !micOn && <span className="text-[11px] bg-black/60 px-1 py-0.5 rounded" title="Microfone desligado">🔇</span>}
                  </div>
                  {p.hand && <span className="absolute top-1 right-1 text-base">✋</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* controls */}
      <div className="flex-shrink-0 flex justify-center pb-5 pt-2">
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
