'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { UserSession } from '@/lib/auth'
import { subscribeNearby } from '@/lib/officeProximity'

/*
 * Real A/V calling for the virtual office (WebRTC mesh, everyone online).
 * - Local mic/camera/screen-share, with optional virtual background on the self-view.
 * - Connects a peer connection to every other online person (mesh) using the
 *   "perfect negotiation" pattern; audio/video tracks are swapped via replaceTrack
 *   so toggling devices never needs renegotiation.
 * - Signaling rides the same SSE hub: presence (default event) tells us who's online,
 *   `signal` events carry SDP/ICE, relayed per-user by /api/escritorio/signal.
 * - Raise hand: POST /api/escritorio/hand → broadcast in presence (shown over avatars).
 *
 * NOTE: uses public STUN only. Peers behind strict/symmetric NAT may need a TURN
 * server — add it to ICE_SERVERS if some users can't connect.
 */

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // Free TURN servers (metered.ca) — fallback for restrictive NAT/firewalls
  { urls: 'turn:a.relay.metered.ca:80',  username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:a.relay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:a.relay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
]

type Bg = 'none' | 'blur' | string
const BGS: { key: Bg; label: string }[] = [
  { key: 'none', label: 'Sem fundo' }, { key: 'blur', label: 'Desfocar' },
  { key: '#0f172a', label: 'Escuro' }, { key: '#0f766e', label: 'Teal' }, { key: '#5b21b6', label: 'Roxo' },
]
const SEG_SRC = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js'
function loadScript(src: string) {
  return new Promise<void>((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res()
    const s = document.createElement('script'); s.src = src; s.crossOrigin = 'anonymous'
    s.onload = () => res(); s.onerror = () => rej(new Error('load failed')); document.head.appendChild(s)
  })
}

type Peer = {
  pc: RTCPeerConnection
  audioSender: RTCRtpSender
  videoSender: RTCRtpSender
  makingOffer: boolean
  stream: MediaStream
}

export default function OfficeCall({ session }: { session: UserSession }) {
  const meId = session.id

  const [micOn, setMicOn] = useState(false)
  const [camOn, setCamOn] = useState(false)
  const [screenOn, setScreenOn] = useState(false)
  const [handUp, setHandUp] = useState(false)
  const [bg, setBg] = useState<Bg>('none')
  const [error, setError] = useState('')
  const [remotes, setRemotes] = useState<{ id: number; name: string; stream: MediaStream }[]>([])

  const peers = useRef(new Map<number, Peer>())
  const names = useRef(new Map<number, string>())
  const onlineIds = useRef(new Set<number>())
  const micTrack = useRef<MediaStreamTrack | null>(null)
  const camTrack = useRef<MediaStreamTrack | null>(null)
  const screenTrack = useRef<MediaStreamTrack | null>(null)

  const selfVideoRef = useRef<HTMLVideoElement>(null)
  const selfCanvasRef = useRef<HTMLCanvasElement>(null)
  const segRef = useRef<any>(null)
  const segRunning = useRef(false)
  const segRaf = useRef(0)
  const bgRef = useRef<Bg>('none'); bgRef.current = bg

  const videoTrack = () => screenTrack.current ?? camTrack.current

  const syncSenders = useCallback(() => {
    const vt = videoTrack()
    peers.current.forEach(p => {
      p.audioSender.replaceTrack(micTrack.current).catch(() => {})
      p.videoSender.replaceTrack(vt).catch(() => {})
    })
  }, [])

  const post = (url: string, body: unknown) =>
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true }).catch(() => {})

  const refreshRemotes = useCallback(() => {
    const list: { id: number; name: string; stream: MediaStream }[] = []
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
        // let presence-driven cleanup handle removal; failed can recover on its own
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
        // Close peers for users who went offline
        peers.current.forEach((_p, id) => { if (!online.has(id)) closePeer(id) })
      } catch {}
    }

    // Proximity-based: only connect A/V to people who are physically nearby
    const unsubProximity = subscribeNearby((nearbyIds) => {
      nearbyIds.forEach(id => { if (!peers.current.has(id) && onlineIds.current.has(id)) createPeer(id) })
      peers.current.forEach((_p, id) => { if (!nearbyIds.has(id)) closePeer(id) })
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
          if (!polite && offerCollision) return // impolite peer ignores colliding offer
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

  // --- virtual background (self-view only) ---
  const onSegResults = (res: any) => {
    const c = selfCanvasRef.current; if (!c) return
    const ctx = c.getContext('2d'); if (!ctx) return
    const w = c.width, h = c.height
    ctx.save(); ctx.clearRect(0, 0, w, h)
    ctx.drawImage(res.segmentationMask, 0, 0, w, h)
    ctx.globalCompositeOperation = 'source-in'; ctx.drawImage(res.image, 0, 0, w, h)
    ctx.globalCompositeOperation = 'destination-over'
    if (bgRef.current === 'blur') { ctx.filter = 'blur(10px)'; ctx.drawImage(res.image, 0, 0, w, h); ctx.filter = 'none' }
    else { ctx.fillStyle = bgRef.current as string; ctx.fillRect(0, 0, w, h) }
    ctx.restore()
  }
  async function startSeg() {
    try {
      if (!segRef.current) {
        await loadScript(SEG_SRC)
        const SS = (window as any).SelfieSegmentation
        const seg = new SS({ locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${f}` })
        seg.setOptions({ modelSelection: 1, selfieMode: true }); seg.onResults(onSegResults)
        segRef.current = seg
      }
      segRunning.current = true
      let busy = false
      const tick = async () => {
        if (!segRunning.current) return
        const v = selfVideoRef.current
        if (v && !busy && v.readyState >= 2) { busy = true; try { await segRef.current.send({ image: v }) } catch {} ; busy = false }
        segRaf.current = requestAnimationFrame(tick)
      }
      tick()
    } catch { setError('Fundo virtual indisponível'); setBg('none') }
  }
  function stopSeg() { segRunning.current = false; cancelAnimationFrame(segRaf.current) }

  function pickBg(next: Bg) {
    setBg(next)
    if (!camOn) return
    if (next === 'none') stopSeg(); else if (!segRunning.current) startSeg()
  }

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
      stopSeg(); camTrack.current?.stop(); camTrack.current = null; setCamOn(false); syncSenders()
      if (selfVideoRef.current) selfVideoRef.current.srcObject = null
    } else {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
        camTrack.current = s.getVideoTracks()[0]; setCamOn(true)
        const v = selfVideoRef.current!; v.srcObject = s; await v.play()
        if (bgRef.current !== 'none') startSeg()
        syncSenders()
      } catch { setError('Não consegui acessar a câmera') }
    }
  }
  async function toggleScreen() {
    setError('')
    if (screenOn) { screenTrack.current?.stop(); screenTrack.current = null; setScreenOn(false); syncSenders() }
    else {
      try {
        const s = await (navigator.mediaDevices as any).getDisplayMedia({ video: true })
        const t = s.getVideoTracks()[0]
        screenTrack.current = t; setScreenOn(true); syncSenders()
        t.onended = () => { screenTrack.current = null; setScreenOn(false); syncSenders() }
      } catch { setError('Compartilhamento de tela cancelado') }
    }
  }
  function toggleHand() {
    const next = !handUp; setHandUp(next); post('/api/escritorio/hand', { raised: next })
  }

  useEffect(() => () => {
    stopSeg()
    micTrack.current?.stop(); camTrack.current?.stop(); screenTrack.current?.stop()
  }, [])

  const showSelf = camOn || screenOn

  return (
    <>
      {/* remote tiles (teammates) — top center */}
      {remotes.length > 0 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex gap-2 max-w-[90vw] overflow-x-auto p-1">
          {remotes.map(r => <RemoteTile key={r.id} name={r.name} stream={r.stream} />)}
        </div>
      )}

      {/* controls + self-view — bottom center */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2">
        <div className={`relative rounded-xl overflow-hidden border border-white/15 bg-black shadow-2xl ${showSelf ? 'block' : 'hidden'}`} style={{ width: 200, height: 150 }}>
          <video ref={selfVideoRef} muted playsInline className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)', display: bg === 'none' || screenOn ? 'block' : 'none' }} />
          <canvas ref={selfCanvasRef} width={640} height={480} className="w-full h-full object-cover" style={{ display: bg === 'none' || screenOn ? 'none' : 'block' }} />
          <span className="absolute bottom-1 left-1 text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded">Você{screenOn ? ' · tela' : ''}</span>
        </div>

        {camOn && !screenOn && (
          <div className="flex items-center gap-1.5 bg-[#0f1420]/90 rounded-full px-3 py-1.5 border border-white/10">
            <span className="text-[11px] text-zinc-400 mr-1">Fundo:</span>
            {BGS.map(b => (
              <button key={String(b.key)} onClick={() => pickBg(b.key)} title={b.label}
                className={`w-5 h-5 rounded-full border-2 ${bg === b.key ? 'border-white scale-110' : 'border-white/20'}`}
                style={{ background: b.key === 'none' ? 'repeating-conic-gradient(#555 0% 25%, #888 0% 50%)' : b.key === 'blur' ? '#94a3b8' : (b.key as string) }} />
            ))}
          </div>
        )}

        {error && <div className="text-[11px] text-amber-300 bg-amber-950/70 rounded-lg px-3 py-1">{error}</div>}

        <div className="flex items-center gap-2 bg-[#0f1420]/90 rounded-full px-3 py-2 border border-white/10 shadow-xl">
          <CtrlButton on={micOn} onClick={toggleMic} title="Microfone" label="mic" />
          <CtrlButton on={camOn} onClick={toggleCam} title="Câmera" label="cam" />
          <CtrlButton on={screenOn} onClick={toggleScreen} title="Compartilhar tela" label="screen" color="blue" />
          <CtrlButton on={handUp} onClick={toggleHand} title="Levantar a mão" label="hand" color="amber" />
        </div>
      </div>
    </>
  )
}

function RemoteTile({ name, stream }: { name: string; stream: MediaStream }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [hasVideo, setHasVideo] = useState(false)
  const [soundBlocked, setSoundBlocked] = useState(false) // browser blocked autoplay of sound

  useEffect(() => {
    const v = videoRef.current
    const a = audioRef.current
    if (v) v.srcObject = stream
    if (a) a.srcObject = stream

    // The teammate's VOICE plays through the dedicated <audio> element below — it is
    // never hidden and never tied to whether their camera is on. The <video> is muted
    // and only shows the picture. (Before, audio rode a <video> that was display:none
    // whenever the camera was off, so nobody could be heard.)
    const playAll = () => {
      v?.play().catch(() => {})
      a?.play().then(() => setSoundBlocked(false)).catch(() => setSoundBlocked(true))
    }
    playAll()

    // Browsers block autoplay of sound until the user interacts with the page, and the
    // old code swallowed that error silently. Retry on the first click/keypress so the
    // audio actually starts for everyone in the room.
    const unlock = () => playAll()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)

    // Tracks are added with addTrack(), which does NOT fire the stream's 'addtrack'
    // event — so poll to keep the video visible and the media playing.
    const poll = setInterval(() => {
      setHasVideo(stream.getVideoTracks().some(t => t.readyState === 'live'))
      if (v && v.paused) v.play().catch(() => {})
      if (a && a.paused) a.play().catch(() => {})
    }, 1000)

    return () => {
      clearInterval(poll)
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [stream])

  return (
    <div className="relative rounded-lg overflow-hidden border border-white/15 bg-[#0f1420] shadow-xl flex-shrink-0" style={{ width: 168, height: 126 }}>
      <video ref={videoRef} muted autoPlay playsInline className="w-full h-full object-cover" style={{ display: hasVideo ? 'block' : 'none' }} />
      {/* Dedicated sink for the teammate's voice — must NOT be muted */}
      <audio ref={audioRef} autoPlay />
      {!hasVideo && <div className="w-full h-full flex items-center justify-center text-zinc-400 text-3xl">🎧</div>}
      {soundBlocked && (
        <button onClick={() => { audioRef.current?.play().then(() => setSoundBlocked(false)).catch(() => {}) }}
          className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-[11px] font-medium px-2 text-center">
          🔊 Clique para ativar o som
        </button>
      )}
      <span className="absolute bottom-1 left-1 text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded">{name}</span>
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
