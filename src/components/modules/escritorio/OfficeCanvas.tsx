'use client'
import { useEffect, useRef, useCallback, useState } from 'react'
import { UserSession } from '@/lib/auth'
import { updateNearby } from '@/lib/officeProximity'

/*
 * Flat-modern office renderer + realtime multiplayer.
 * Drawn in a logical world (BW x BH) and scaled smoothly to the screen (vector
 * look, not pixel-art). Open-plan: ONE walled Meeting Room (decor) + 8 desks.
 *
 * Seating model: every online person is auto-assigned a fixed desk chair by the
 * server (officeHub) — no free walking. People currently in the meeting room are
 * NOT drawn here (their chair sits empty). Voice connects to seated neighbours.
 */

const BW = 640
const BH = 420
const PR = 8
const CHAT_RADIUS = 58
const AUDIO_RADIUS = 220 // proximity radius for office voice (covers the open area)

type Status = 'online' | 'ocupado' | 'reuniao'
type Facing = 'down' | 'up' | 'left' | 'right'
type NetPlayer = {
  id: number; name: string; role: string; avatarColor?: string
  x: number; y: number; status: Status; hand?: boolean
  seat: number; meeting: boolean; meetingSeat: number; t: number
}
type Rect = { x: number; y: number; w: number; h: number }

const MR: Rect = { x: 12, y: 20, w: 214, h: 156 }
const WT = 7
const DOOR_Y = MR.y + MR.h / 2 - 24
const DOOR_H = 48
const WALLS: Rect[] = [
  { x: MR.x, y: MR.y, w: MR.w, h: WT },
  { x: MR.x, y: MR.y, w: WT, h: MR.h },
  { x: MR.x, y: MR.y + MR.h - WT, w: MR.w, h: WT },
  { x: MR.x + MR.w - WT, y: MR.y, w: WT, h: DOOR_Y - MR.y },
  { x: MR.x + MR.w - WT, y: DOOR_Y + DOOR_H, w: WT, h: MR.y + MR.h - (DOOR_Y + DOOR_H) },
]
const MT = { cx: MR.x + MR.w / 2, cy: MR.y + MR.h / 2 }
// 8 chairs around the meeting table — index = meetingSeat (so the office shows
// exactly who is sitting in the meeting room, in their assigned chair).
const MEETING_SEATS: { x: number; y: number; facing: Facing }[] = [
  { x: MT.cx - 50, y: MT.cy - 33, facing: 'down' }, { x: MT.cx, y: MT.cy - 33, facing: 'down' }, { x: MT.cx + 50, y: MT.cy - 33, facing: 'down' },
  { x: MT.cx - 84, y: MT.cy, facing: 'right' }, { x: MT.cx + 84, y: MT.cy, facing: 'left' },
  { x: MT.cx - 50, y: MT.cy + 33, facing: 'up' }, { x: MT.cx, y: MT.cy + 33, facing: 'up' }, { x: MT.cx + 50, y: MT.cy + 33, facing: 'up' },
]
const DESKS = [
  { x: 300, y: 64 }, { x: 393, y: 64 }, { x: 486, y: 64 }, { x: 575, y: 64 },
  { x: 300, y: 250 }, { x: 393, y: 250 }, { x: 486, y: 250 }, { x: 575, y: 250 },
]
// One seat in front of each desk (person sits facing up toward their monitor).
const OFFICE_SEATS = DESKS.map(d => ({ x: d.x + 30, y: d.y + 60 }))
const PLANTS = [ { x: 246, y: 28 }, { x: 610, y: 150 }, { x: 24, y: 360 }, { x: 300, y: 380 }, { x: 610, y: 360 } ]

const ROLE_SHIRT: Record<string, string> = {
  socio: '#f0a23a', gestor_trafego: '#4f8de8', social_media: '#e8804f', designer: '#b06fd0', staff: '#7a8290',
}
const ROLE_HAIR: Record<string, string> = {
  socio: '#5a4032', gestor_trafego: '#241a14', social_media: '#3a2c24', designer: '#2a2230', staff: '#33312e',
}
const STATUS_COLOR: Record<Status, string> = { online: '#34d36a', ocupado: '#f0a23a', reuniao: '#5aa0f0' }

function rrp(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath()
  c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r)
  c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r)
  c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath()
}
const fillRR = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, col: string) => { c.fillStyle = col; rrp(c, x, y, w, h, r); c.fill() }
const ell = (c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, col: string) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill() }

function drawDesk(c: CanvasRenderingContext2D, x: number, y: number) {
  ell(c, x + 30, y + 54, 28, 6, 'rgba(0,0,0,0.08)')
  fillRR(c, x, y, 60, 26, 7, '#c89b6b')
  fillRR(c, x, y + 20, 60, 6, 3, '#a9794a')
  fillRR(c, x + 16, y + 3, 28, 16, 3, '#2b303a')
  fillRR(c, x + 19, y + 6, 22, 11, 2, '#6fd3e6')
  fillRR(c, x + 6, y + 7, 9, 9, 2, '#e0584f')
  fillRR(c, x + 16, y + 30, 28, 22, 8, '#525b67')
  fillRR(c, x + 16, y + 46, 28, 6, 3, '#3f4651')
}
function drawPlant(c: CanvasRenderingContext2D, x: number, y: number) {
  ell(c, x + 14, y + 34, 14, 5, 'rgba(0,0,0,0.08)')
  fillRR(c, x + 2, y + 22, 24, 16, 4, '#c0743f')
  c.fillStyle = '#5aa86b'; c.beginPath(); c.arc(x + 14, y + 12, 13, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#4f9c61'; c.beginPath(); c.arc(x + 5, y + 16, 9, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#69b878'; c.beginPath(); c.arc(x + 23, y + 16, 9, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#79c486'; c.beginPath(); c.arc(x + 14, y + 8, 6, 0, Math.PI * 2); c.fill()
}
function drawMeetingTable(c: CanvasRenderingContext2D) {
  MEETING_SEATS.forEach(s => fillRR(c, s.x - 13, s.y - 9, 26, 18, 5, '#525b67'))
  ell(c, MT.cx, MT.cy + 4, 72, 40, '#cfa06c')
  ell(c, MT.cx, MT.cy, 72, 38, '#d8ab74')
  ell(c, MT.cx - 8, MT.cy - 7, 38, 16, 'rgba(226,187,138,0.6)')
}
function drawWalls(c: CanvasRenderingContext2D) {
  WALLS.forEach(w => {
    fillRR(c, w.x, w.y, w.w, w.h, 2, '#b58e62')
    c.fillStyle = '#caa37a'; c.fillRect(w.x, w.y, w.w, Math.min(2, w.h))
    c.fillStyle = '#8a6840'; c.fillRect(w.x, w.y + w.h - 1.5, w.w, 1.5)
  })
}

function drawPerson(c: CanvasRenderingContext2D, gx: number, gy: number, shirt: string, hair: string, facing: Facing = 'up') {
  ell(c, gx, gy, 13, 5, 'rgba(0,0,0,0.10)')
  // arms at rest
  fillRR(c, gx - 14, gy - 20, 4, 12, 2, shirt)
  fillRR(c, gx + 10, gy - 20, 4, 12, 2, shirt)
  // body
  fillRR(c, gx - 12, gy - 22, 24, 20, 8, shirt)
  fillRR(c, gx - 12, gy - 8, 24, 6, 4, 'rgba(0,0,0,0.10)')
  // head
  c.fillStyle = '#f1c9a5'; c.beginPath(); c.arc(gx, gy - 28, 10, 0, Math.PI * 2); c.fill()
  // hair
  c.fillStyle = hair
  if (facing === 'up') { c.beginPath(); c.arc(gx, gy - 28, 10, 0, Math.PI * 2); c.fill() }
  else { c.beginPath(); c.arc(gx, gy - 30, 10, Math.PI, 0); c.fill(); c.fillRect(gx - 10, gy - 31, 20, 3) }
  // eyes
  if (facing !== 'up') {
    c.fillStyle = '#2a2330'
    c.beginPath(); c.arc(gx - 3, gy - 27, 1.5, 0, Math.PI * 2); c.fill()
    c.beginPath(); c.arc(gx + 3, gy - 27, 1.5, 0, Math.PI * 2); c.fill()
  }
}
function drawBubble(c: CanvasRenderingContext2D, gx: number, gy: number, text: string) {
  const t = text.length > 42 ? text.slice(0, 41) + '…' : text
  c.font = '10px ui-sans-serif, system-ui, sans-serif'
  c.textAlign = 'left'
  const w = Math.min(160, c.measureText(t).width + 16)
  const x = gx - w / 2, y = gy - 70
  fillRR(c, x, y, w, 18, 9, '#ffffff')
  c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(gx - 4, y + 18); c.lineTo(gx + 4, y + 18); c.lineTo(gx, y + 23); c.closePath(); c.fill()
  c.fillStyle = '#1f2630'; c.fillText(t, x + 8, y + 12)
}
function drawNameTag(c: CanvasRenderingContext2D, gx: number, gy: number, name: string, statusColor: string, me = false) {
  c.font = `${me ? '600 ' : ''}10px ui-sans-serif, system-ui, sans-serif`
  c.textAlign = 'left'
  const w = c.measureText(name).width + 24
  const x = gx - w / 2, y = gy - 48
  fillRR(c, x, y, w, 17, 8, me ? 'rgba(15,20,28,0.92)' : 'rgba(31,38,48,0.88)')
  c.fillStyle = statusColor; c.beginPath(); c.arc(x + 9, y + 8.5, 3.5, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#fff'; c.fillText(name, x + 16, y + 12)
}

export default function OfficeCanvas({ session, active = true, avatarColor }: { session: UserSession; active?: boolean; avatarColor?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef(0)
  const view = useRef({ scale: 2, ox: 0, oy: 0, cw: BW, ch: BH })
  const activeRef = useRef(active)
  const zoomMult = useRef(1.0)
  const resizeFn = useRef<() => void>(() => {})
  activeRef.current = active

  const othersRef = useRef<NetPlayer[]>([])
  const mySeat = useRef(-1)
  const frame = useRef(0)
  const bubbles = useRef(new Map<number, { text: string; until: number }>())
  const nearbyKey = useRef('')
  const inputRef = useRef<HTMLInputElement>(null)

  const [nearby, setNearby] = useState<string[]>([])
  const [msgs, setMsgs] = useState<{ id: number; name: string; text: string; t: number }[]>([])

  const meId = session.id
  const shirt = avatarColor ?? ROLE_SHIRT[session.role] ?? '#7a8290'
  const hairCol = ROLE_HAIR[session.role] ?? '#33312e'
  const firstName = session.name.split(' ')[0]

  // My fixed seat position (falls back to room centre while waiting for a seat).
  const myPos = () => {
    const s = OFFICE_SEATS[mySeat.current]
    return s ?? { x: 440, y: 200 }
  }

  const render = useCallback((c: CanvasRenderingContext2D) => {
    const { scale, ox, oy, cw, ch } = view.current
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.fillStyle = '#cdb78f'; c.fillRect(0, 0, cw, ch)
    c.imageSmoothingEnabled = true
    c.setTransform(scale, 0, 0, scale, ox, oy)

    // floor
    c.fillStyle = '#ecdab9'; c.fillRect(0, 0, BW, BH)
    c.strokeStyle = 'rgba(224,202,161,0.7)'; c.lineWidth = 2
    for (let gy = 28; gy < BH; gy += 28) { c.beginPath(); c.moveTo(0, gy); c.lineTo(BW, gy); c.stroke() }

    // meeting room carpet
    fillRR(c, MR.x + WT, MR.y + WT, MR.w - WT * 2, MR.h - WT * 2, 6, '#d8e7f3')

    // furniture
    DESKS.forEach(d => drawDesk(c, d.x, d.y))
    PLANTS.forEach(p => drawPlant(c, p.x, p.y))
    drawMeetingTable(c)

    const now = Date.now()
    // People at their fixed chairs: office workers at their desk, and anyone in
    // the meeting drawn seated around the meeting-room table (visible from outside).
    const people: { id: number; x: number; y: number; facing: Facing; shirt: string; hair: string; name: string; status: Status; hand: boolean; me: boolean }[] = []
    othersRef.current.forEach(p => {
      if (now - p.t > 12000) return
      const shirtCol = p.avatarColor ?? ROLE_SHIRT[p.role] ?? '#7a8290'
      const hair = ROLE_HAIR[p.role] ?? '#33312e'
      const name = p.name.split(' ')[0]
      if (p.meeting) {
        const ms = MEETING_SEATS[p.meetingSeat]; if (!ms) return
        people.push({ id: p.id, x: ms.x, y: ms.y, facing: ms.facing, shirt: shirtCol, hair, name, status: 'reuniao', hand: !!p.hand, me: false })
      } else {
        const seat = OFFICE_SEATS[p.seat]; if (!seat) return
        people.push({ id: p.id, x: seat.x, y: seat.y, facing: 'up', shirt: shirtCol, hair, name, status: p.status, hand: !!p.hand, me: false })
      }
    })
    if (mySeat.current >= 0) {
      const mp = myPos()
      people.push({ id: meId, x: mp.x, y: mp.y, facing: 'up', shirt, hair: hairCol, name: firstName, status: active ? 'online' : 'ocupado', hand: false, me: true })
    }
    people.sort((a, b) => a.y - b.y) // simple depth order
    people.forEach(p => drawPerson(c, p.x, p.y, p.shirt, p.hair, p.facing))

    // walls on top (occlude avatars behind them)
    drawWalls(c)

    // name tags + speech bubbles above everything
    people.forEach(p => drawNameTag(c, p.x, p.y, p.name, STATUS_COLOR[p.status], p.me))
    people.forEach(p => {
      const b = bubbles.current.get(p.id)
      if (b && now < b.until) drawBubble(c, p.x, p.y, b.text)
    })
    // raised hands
    c.textAlign = 'center'; c.font = '14px serif'
    people.forEach(p => { if (p.hand) c.fillText('✋', p.x + 16, p.y - 34) })

    // meeting room label (with live occupant count)
    c.font = '600 10px ui-sans-serif, system-ui, sans-serif'; c.textAlign = 'center'
    const mtgCount = othersRef.current.filter(p => now - p.t < 12000 && p.meeting).length
    const lbl = mtgCount > 0 ? `Sala de reunião · ${mtgCount}` : 'Sala de reunião'
    const lw = c.measureText(lbl).width + 16
    fillRR(c, MR.x + MR.w / 2 - lw / 2, MR.y + 10, lw, 17, 8, 'rgba(51,65,79,0.9)')
    c.fillStyle = '#fff'; c.fillText(lbl, MR.x + MR.w / 2, MR.y + 22)

    // --- screen-space HUD ---
    c.setTransform(1, 0, 0, 1, 0, 0)
    const inMeetingNow = othersRef.current.filter(p => now - p.t < 12000 && p.meeting).length
    const online = othersRef.current.filter(p => now - p.t < 12000).length + 1
    const cTxt = `${online} online${inMeetingNow ? ` · ${inMeetingNow} em reunião` : ''}`
    c.textAlign = 'left'; c.font = 'bold 12px ui-sans-serif, system-ui, sans-serif'
    const cw2 = c.measureText(cTxt).width + 30
    fillRR(c, 12, ch - 44, cw2, 28, 8, 'rgba(20,24,32,0.78)')
    c.fillStyle = '#34d36a'; c.beginPath(); c.arc(24, ch - 30, 4, 0, Math.PI * 2); c.fill()
    c.fillStyle = '#fff'; c.fillText(cTxt, 34, ch - 26)

    c.textAlign = 'right'; c.font = '12px ui-sans-serif, system-ui, sans-serif'
    c.fillStyle = 'rgba(60,50,35,0.5)'
    c.fillText('Você está no seu lugar · use o scroll para dar zoom', cw - 16, ch - 18)
  }, [shirt, hairCol, firstName, meId, active])

  // SSE in (presence + chat)
  useEffect(() => {
    const es = new EventSource('/api/escritorio/stream')
    es.onmessage = (e) => {
      try {
        const arr = JSON.parse(e.data) as NetPlayer[]
        const mine = arr.find(p => p.id === meId)
        mySeat.current = mine ? mine.seat : -1
        othersRef.current = arr.filter(p => p.id !== meId)
      } catch {}
    }
    es.addEventListener('chat', (e) => {
      try {
        const m = JSON.parse((e as MessageEvent).data) as { id: number; name: string; x: number; y: number; text: string; t: number }
        const mp = myPos()
        // show only messages from people seated near me (or my own)
        const near = m.id === meId || (m.x - mp.x) ** 2 + (m.y - mp.y) ** 2 < (CHAT_RADIUS * 2.2) ** 2
        if (!near) return
        bubbles.current.set(m.id, { text: m.text, until: Date.now() + 4500 })
        setMsgs(prev => [...prev.slice(-29), { id: m.id, name: m.name.split(' ')[0], text: m.text, t: m.t }])
      } catch {}
    })
    return () => es.close()
  }, [meId])

  // render loop + proximity (no movement — fixed seats)
  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const cw = wrap.clientWidth, ch = wrap.clientHeight
      canvas.width = cw * dpr; canvas.height = ch * dpr
      canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px'
      const baseScale = Math.min((cw * dpr) / BW, (ch * dpr) / BH)
      const scale = baseScale * zoomMult.current
      view.current = { scale, ox: (cw * dpr - BW * scale) / 2, oy: (ch * dpr - BH * scale) / 2, cw: cw * dpr, ch: ch * dpr }
    }
    resizeFn.current = resize
    resize(); const ro = new ResizeObserver(resize); ro.observe(wrap)

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
      zoomMult.current = Math.max(0.5, Math.min(3, zoomMult.current * factor))
      resizeFn.current()
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })

    const loop = () => {
      frame.current++
      // proximity for office voice — seated neighbours not in the meeting
      const now = Date.now()
      const mp = myPos()
      const seated = othersRef.current.filter(p => now - p.t < 12000 && !p.meeting && p.seat >= 0)
      const posOf = (p: NetPlayer) => OFFICE_SEATS[p.seat] ?? { x: -999, y: -999 }
      const dist2 = (p: NetPlayer) => { const s = posOf(p); return (s.x - mp.x) ** 2 + (s.y - mp.y) ** 2 }
      const near = seated.filter(p => dist2(p) < CHAT_RADIUS ** 2)
      const audioNear = seated.filter(p => dist2(p) < AUDIO_RADIUS ** 2)
      const key = near.map(p => p.id).sort().join(',')
      if (key !== nearbyKey.current) { nearbyKey.current = key; setNearby(near.map(p => p.name.split(' ')[0])) }
      updateNearby(new Set(audioNear.map(p => p.id)))

      render(ctx)
      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)

    return () => {
      canvas.removeEventListener('wheel', onWheel)
      ro.disconnect(); cancelAnimationFrame(animRef.current)
      updateNearby(new Set()) // drop office peers when leaving the canvas
    }
  }, [render])

  async function sendChat(e: React.FormEvent) {
    e.preventDefault()
    const el = inputRef.current
    const t = el?.value.trim()
    if (!t) return
    el!.value = ''
    const mp = myPos()
    try {
      await fetch('/api/escritorio/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t, x: mp.x, y: mp.y }),
      })
    } catch {}
  }

  return (
    <div ref={wrapRef} className="relative w-full h-full">
      <canvas ref={canvasRef} className="block" />
      {nearby.length > 0 && (
        <div className="absolute bottom-3 right-3 w-72 max-w-[80vw] rounded-xl border border-white/10 bg-[#0f1420]/95 shadow-2xl flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-white/10 text-xs text-zinc-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
            Por perto: <span className="text-white font-medium truncate">{nearby.join(', ')}</span>
          </div>
          <div className="px-3 py-2 space-y-1.5 max-h-44 overflow-y-auto text-sm">
            {msgs.length === 0 && <div className="text-zinc-500 text-xs">Diga oi 👋</div>}
            {msgs.slice(-8).map((m, i) => (
              <div key={i} className="leading-snug break-words">
                <span className="font-semibold" style={{ color: m.id === meId ? '#9ad0ff' : '#7ee0a8' }}>{m.name}: </span>
                <span className="text-zinc-200">{m.text}</span>
              </div>
            ))}
          </div>
          <form onSubmit={sendChat} className="flex border-t border-white/10">
            <input ref={inputRef} maxLength={280} placeholder="Mensagem..." className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none" />
            <button type="submit" className="px-3 text-purple-300 hover:text-white text-sm font-medium">Enviar</button>
          </form>
        </div>
      )}
    </div>
  )
}
