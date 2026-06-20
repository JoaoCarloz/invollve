'use client'
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { UserSession } from '@/lib/auth'
import { subscribeNearby } from '@/lib/officeProximity'

/*
 * Real A/V calling for the virtual office (WebRTC mesh).
 *
 * Refactored into a CallProvider/context so both the office dock and the
 * full-screen meeting room can share ONE set of peer connections and streams:
 *   - CallProvider owns the mesh (local mic/cam/screen tracks, per-peer RTCPeerConnection).
 *   - Voice is always audible: the provider renders a hidden <audio> sink per remote,
 *     independent of whether any video is shown (this is what fixed the mic bug).
 *   - Video is rendered where the view wants it: <SelfView/> for my own seat,
 *     <RemoteVideo/> for a teammate's seat (meeting room), or remote tiles (legacy).
 *   - Which peers we connect to is driven by officeProximity.subscribeNearby: the
 *     mounted view pushes the desired set (office = nearby seats, meeting = everyone
 *     in the meeting).
 *
 * Uses public STUN + free TURN fallback for restrictive NAT.
 */

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'turn:a.relay.metered.ca:80',  username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:a.relay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:a.relay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
]

type Peer = {
  pc: RTCPeerConnection
  audioSender: RTCRtpSender
  videoSender: RTCRtpSender
  makingOffer: boolean
  stream: MediaStream
}

export type Remote = { id: number; name: string; stream: MediaStream }

interface CallCtx {
  micOn: boolean
  camOn: boolean
  screenOn: boolean
  handUp: boolean
  error: string
  remotes: Remote[]
  selfStream: MediaStream | null
  showSelf: boolean
  toggleMic: () => void
  toggleCam: () => void
  toggleScreen: () => void
  toggleHand: () => void
}

const Ctx = createContext<CallCtx | null>(null)
export function useCall(): CallCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useCall must be used inside <CallProvider>')
  return c
}

export function CallProvider({ session, children }: { session: UserSession; children: React.ReactNode }) {
  const meId = session.id

  const [micOn, setMicOn] = useState(false)
  const [camOn, setCamOn] = useState(false)
  const [screenOn, setScreenOn] = useState(false)
  const [handUp, setHandUp] = useState(false)
  const [error, setError] = useState('')
  const [remotes, setRemotes] = useState<Remote[]>([])
  const [selfStream, setSelfStream] = useState<MediaStream | null>(null)

  const peers = useRef(new Map<number, Peer>())
  const names = useRef(new Map<number, string>())
  const onlineIds = useRef(new Set<number>())
  const micTrack = useRef<MediaStreamTrack | null>(null)
  const camTrack = useRef<MediaStreamTrack | null>(null)
  const screenTrack = useRef<MediaStreamTrack | null>(null)

  const videoTrack = () => screenTrack.current ?? camTrack.current

  // Keep a single MediaStream holding the active local video track (cam or screen),
  // so <SelfView/> can render it wherever the view wants.
  const updateSelfStream = useCallback(() => {
    const vt = videoTrack()
    if (!vt) { setSelfStream(null); return }
    const s = new MediaStream(); s.addTrack(vt); setSelfStream(s)
  }, [])

  const syncSenders = useCallback(() => {
    const vt = videoTrack()
    peers.current.forEach(p => {
      p.audioSender.replaceTrack(micTrack.current).catch(() => {})
      p.videoSender.replaceTrack(vt).catch(() => {})
    })
    updateSelfStream()
  }, [updateSelfStream])

  const post = (url: string, body: unknown) =>
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true }).catch(() => {})

  const refreshRemotes = useCallback(() => {
    const list: Remote[] = []
    peers.current.forEach((p, id) => list.push({ id, name: names.current.get(id) ?? 'Colega', stream: p.stream }))
    setRemotes(list)
  }, [])

  const createPeer = useCallback((peerId: number): Peer => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    const audioSender = pc.addTransceiver('audio', { direction: 'sendrecv' }).sender
    const videoSender = pc.addTransceiver('video', { direction: 'sendrecv' }).sender
    const stream = new MediaStream()
    const peer: Peer = { pc, audioSender, videoSender, makingOffer: false, stream }
    peers.current.set(peerId, peer)

    audioSender.replaceTrack(micTrack.current).catch(() => {})
    videoSender.replaceTrack(videoTrack()).catch(() => {})

    pc.onnegotiationneeded = async () => {
      try {
        peer.makingOffer = true
        await pc.setLocalDescription()
        post('/api/escritorio/signal', { to: peerId, data: { description: pc.localDescription } })
      } catch {} finally { peer.makingOffer = false }
    }
    pc.onicecandidate = (e) => { if (e.candidate) post('/api/escritorio/signal', { to: peerId, data: { candidate: e.candidate } }) }
    pc.ontrack = (e) => { peer.stream.addTrack(e.track); refreshRemotes() }
    pc.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
        // presence-driven cleanup handles removal; 'failed' can recover on its own
      }
    }
    return peer
  }, [refreshRemotes])

  const closePeer = useCallback((peerId: number) => {
    const p = peers.current.get(peerId)
    if (!p) return
    try { p.pc.close() } catch {}
    peers.current.delete(peerId)
    refreshRemotes()
  }, [refreshRemotes])

  // --- signaling + presence over SSE ---
  useEffect(() => {
    const es = new EventSource('/api/escritorio/stream')

    es.onmessage = (e) => {
      try {
        const arr = JSON.parse(e.data) as { id: number; name: string }[]
        const online = new Set<number>()
        arr.forEach(p => { if (p.id !== meId) { online.add(p.id); names.current.set(p.id, p.name.split(' ')[0]) } })
        onlineIds.current = online
        peers.current.forEach((_p, id) => { if (!online.has(id)) closePeer(id) })
      } catch {}
    }

    // Connect A/V only to the peer set the mounted view wants (proximity or meeting).
    const unsubProximity = subscribeNearby((wantedIds) => {
      wantedIds.forEach(id => { if (!peers.current.has(id) && onlineIds.current.has(id)) createPeer(id) })
      peers.current.forEach((_p, id) => { if (!wantedIds.has(id)) closePeer(id) })
    })

    es.addEventListener('signal', async (ev) => {
      try {
        const { from, data } = JSON.parse((ev as MessageEvent).data) as { from: number; data: any }
        let peer = peers.current.get(from)
        if (!peer) peer = createPeer(from)
        const pc = peer.pc
        const polite = meId > from
        if (data.description) {
          const offerCollision = data.description.type === 'offer' && (peer.makingOffer || pc.signalingState !== 'stable')
          if (!polite && offerCollision) return
          await pc.setRemoteDescription(data.description)
          if (data.description.type === 'offer') {
            await pc.setLocalDescription()
            post('/api/escritorio/signal', { to: from, data: { description: pc.localDescription } })
          }
        } else if (data.candidate) {
          try { await pc.addIceCandidate(data.candidate) } catch {}
        }
      } catch {}
    })

    return () => {
      es.close()
      unsubProximity()
      peers.current.forEach(p => { try { p.pc.close() } catch {} })
      peers.current.clear()
    }
  }, [meId, createPeer, closePeer])

  // --- device toggles ---
  async function toggleMic() {
    setError('')
    if (micOn) { micTrack.current?.stop(); micTrack.current = null; setMicOn(false); syncSenders() }
    else {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true })
        micTrack.current = s.getAudioTracks()[0]; setMicOn(true); syncSenders()
      } catch { setError('Não consegui acessar o microfone') }
    }
  }
  async function toggleCam() {
    setError('')
    if (camOn) {
      camTrack.current?.stop(); camTrack.current = null; setCamOn(false); syncSenders()
    } else {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
        camTrack.current = s.getVideoTracks()[0]; setCamOn(true); syncSenders()
      } catch { setError('Não consegui acessar a câmera') }
    }
  }
  async function toggleScreen() {
    setError('')
    if (screenOn) {
      screenTrack.current?.stop(); screenTrack.current = null; setScreenOn(false); syncSenders()
      post('/api/escritorio/screen', { sharing: false })
    } else {
      try {
        const s = await (navigator.mediaDevices as any).getDisplayMedia({ video: true })
        const t = s.getVideoTracks()[0]
        screenTrack.current = t; setScreenOn(true); syncSenders()
        post('/api/escritorio/screen', { sharing: true })
        t.onended = () => { screenTrack.current = null; setScreenOn(false); syncSenders(); post('/api/escritorio/screen', { sharing: false }) }
      } catch { setError('Compartilhamento de tela cancelado') }
    }
  }
  function toggleHand() {
    const next = !handUp; setHandUp(next); post('/api/escritorio/hand', { raised: next })
  }

  useEffect(() => () => {
    micTrack.current?.stop(); camTrack.current?.stop(); screenTrack.current?.stop()
  }, [])

  const showSelf = camOn || screenOn

  const value: CallCtx = {
    micOn, camOn, screenOn, handUp, error, remotes, selfStream, showSelf,
    toggleMic, toggleCam, toggleScreen, toggleHand,
  }

  return (
    <Ctx.Provider value={value}>
      {children}
      {/* Always-on hidden voice layer — teammates are heard regardless of any video. */}
      <AudioSinks remotes={remotes} />
    </Ctx.Provider>
  )
}

/* Hidden <audio> per remote so voice plays even when no video is shown anywhere. */
function AudioSinks({ remotes }: { remotes: Remote[] }) {
  return (
    <div className="hidden">
      {remotes.map(r => <AudioSink key={r.id} stream={r.stream} />)}
    </div>
  )
}
function AudioSink({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    const a = ref.current; if (!a) return
    a.srcObject = stream
    const play = () => a.play().catch(() => {})
    play()
    // Browsers block sound autoplay until a user gesture — retry on first interaction.
    const unlock = () => play()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    const poll = setInterval(() => { if (a.paused) a.play().catch(() => {}) }, 1500)
    return () => { clearInterval(poll); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock) }
  }, [stream])
  return <audio ref={ref} autoPlay />
}

/* My local video (cam or screen) for embedding in my seat. Mirrored for camera. */
export function SelfView({ className = '', mirror = true }: { className?: string; mirror?: boolean }) {
  const { selfStream, screenOn } = useCall()
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current; if (!v) return
    v.srcObject = selfStream
    if (selfStream) v.play().catch(() => {})
  }, [selfStream])
  return (
    <video ref={ref} muted playsInline className={className}
      style={{ transform: mirror && !screenOn ? 'scaleX(-1)' : undefined }} />
  )
}

/* A teammate's video for embedding in their seat. Hidden (so the avatar shows
 * behind it) until their video track is actually live. */
export function RemoteVideo({ id, className = '' }: { id: number; className?: string }) {
  const { remotes } = useCall()
  const stream = remotes.find(r => r.id === id)?.stream ?? null
  const ref = useRef<HTMLVideoElement>(null)
  const [hasVideo, setHasVideo] = useState(false)
  useEffect(() => {
    const v = ref.current; if (!v) return
    v.srcObject = stream
    if (stream) v.play().catch(() => {})
    const poll = setInterval(() => {
      setHasVideo(!!stream && stream.getVideoTracks().some(t => t.readyState === 'live'))
      if (stream && v.paused) v.play().catch(() => {})
    }, 800)
    return () => clearInterval(poll)
  }, [stream])
  return <video ref={ref} muted autoPlay playsInline className={className} style={{ display: hasVideo ? 'block' : 'none' }} />
}

/* Reusable control dock. `variant` decides which buttons appear; `extra` slots a
 * primary action (Enter / Leave meeting). */
export function CallControls({ variant, extra }: { variant: 'office' | 'meeting'; extra?: React.ReactNode }) {
  const { micOn, camOn, screenOn, handUp, error, toggleMic, toggleCam, toggleScreen, toggleHand } = useCall()
  return (
    <div className="flex flex-col items-center gap-2">
      {error && <div className="text-[11px] text-amber-300 bg-amber-950/70 rounded-lg px-3 py-1">{error}</div>}
      <div className="flex items-center gap-2 bg-[#0f1420]/90 rounded-full px-3 py-2 border border-white/10 shadow-xl">
        <CtrlButton on={micOn} onClick={toggleMic} title="Microfone" label="mic" />
        {variant === 'meeting' && <CtrlButton on={camOn} onClick={toggleCam} title="Câmera" label="cam" />}
        {variant === 'meeting' && <CtrlButton on={screenOn} onClick={toggleScreen} title="Compartilhar tela" label="screen" color="blue" />}
        <CtrlButton on={handUp} onClick={toggleHand} title="Levantar a mão" label="hand" color="amber" />
        {extra}
      </div>
    </div>
  )
}

function CtrlButton({ on, onClick, title, label, color = 'green' }: { on: boolean; onClick: () => void; title: string; label: string; color?: 'green' | 'blue' | 'amber' }) {
  const onBg = color === 'blue' ? 'bg-blue-600' : color === 'amber' ? 'bg-amber-500' : 'bg-green-600'
  return (
    <button onClick={onClick} title={title}
      className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all ${on ? `${onBg} text-white` : 'bg-white/10 text-zinc-300 hover:bg-white/20'}`}>
      {on && color === 'green' && <span className="absolute inset-0 rounded-full bg-green-500/40 animate-ping" />}
      <Icon label={label} off={!on} />
    </button>
  )
}

function Icon({ label, off }: { label: string; off: boolean }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const cut = off ? <line x1="3" y1="3" x2="21" y2="21" stroke="#f87171" /> : null
  if (label === 'mic') return <svg {...common}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4" />{cut}</svg>
  if (label === 'cam') return <svg {...common}><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" />{cut}</svg>
  if (label === 'screen') return <svg {...common}><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
  return <svg {...common}><path d="M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8" /><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8 2 2 0 1 1 4 0" /></svg>
}
