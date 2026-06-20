'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { UserSession } from '@/lib/auth'
import OfficeCanvas from './OfficeCanvas'
import MeetingRoom from './MeetingRoom'
import { CallProvider } from './OfficeCall'
import AvatarSelect, { shouldShowAvatarSelect, getAvatarColor } from './AvatarSelect'

const OFFICE_PATH = '/dashboard/escritorio'

const TITLES: Record<string, string> = {
  '/dashboard':             '🏠 Início',
  '/dashboard/financeiro':  '💰 Financeiro',
  '/dashboard/comercial':   '🚀 Comercial',
  '/dashboard/clientes':    '👥 Clientes',
  '/dashboard/tarefas':     '✅ Tarefas',
  '/dashboard/performance': '📈 Performance',
  '/dashboard/rh':          '🎂 RH & Equipe',
  '/dashboard/drive':       '📁 Drive',
  '/dashboard/reunioes':    '📅 Reuniões',
  '/dashboard/processos':   '⚙️ Processos',
  '/dashboard/joao':        '🧑‍💼 João (IA)',
  '/dashboard/agentes':     '🤖 Agentes de IA',
  '/dashboard/chat':        '💬 Chat',
  '/dashboard/usuarios':    '🔧 Usuários',
  '/dashboard/perfil':      '👤 Meu Perfil',
}

function titleFor(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname]
  const match = Object.keys(TITLES)
    .filter(k => k !== '/dashboard' && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0]
  return match ? TITLES[match] : 'Invollve'
}

const post = (url: string, body: unknown) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true }).catch(() => {})

export default function OfficeShell({ session, children }: { session: UserSession; children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const overlayOpen = pathname !== OFFICE_PATH

  // Avatar selection shown once per session on first enter
  const [showSelect, setShowSelect] = useState(false)
  const [avatarColor, setAvatarColor] = useState<string>('')
  const [inMeeting, setInMeeting] = useState(false)

  useEffect(() => {
    setAvatarColor(getAvatarColor(session.role))
    setShowSelect(shouldShowAvatarSelect())
  }, [session.role])

  // Presence heartbeat — keeps this user in the hub (assigns a seat) and fresh.
  useEffect(() => {
    if (showSelect) return
    const beat = () => {
      const status = inMeeting ? 'reuniao' : overlayOpen ? 'ocupado' : 'online'
      post('/api/escritorio/move', { status, avatarColor: avatarColor || null })
    }
    beat()
    const id = setInterval(beat, 3000)
    return () => clearInterval(id)
  }, [showSelect, inMeeting, overlayOpen, avatarColor])

  // Leaving the office area (opening another module) drops you out of the meeting.
  useEffect(() => {
    if (inMeeting && overlayOpen) { post('/api/escritorio/meeting', { join: false }); setInMeeting(false) }
  }, [inMeeting, overlayOpen])

  // Leave the meeting if the tab is closed.
  useEffect(() => {
    const onUnload = () => { if (inMeeting) post('/api/escritorio/meeting', { join: false }) }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [inMeeting])

  function closeWindow() { router.push(OFFICE_PATH) }
  function handleEnter(color: string) { setAvatarColor(color); setShowSelect(false) }

  const enterMeeting = useCallback(() => {
    router.push(OFFICE_PATH)
    post('/api/escritorio/meeting', { join: true })
    setInMeeting(true)
  }, [router])

  const leaveMeeting = useCallback(() => {
    post('/api/escritorio/meeting', { join: false })
    setInMeeting(false)
  }, [])

  return (
    <CallProvider session={session}>
      <div className="relative flex-1 h-screen overflow-hidden">
        {inMeeting ? (
          <MeetingRoom session={session} avatarColor={avatarColor} onLeave={leaveMeeting} />
        ) : (
          <>
            {/* Persistent office canvas */}
            <div className={`absolute inset-0 transition-all duration-300 ${overlayOpen ? 'scale-[0.99] blur-[2px] brightness-[0.55]' : ''}`}>
              <OfficeCanvas session={session} active={!overlayOpen && !showSelect} avatarColor={avatarColor} />
            </div>

            {/* Floating module window */}
            {overlayOpen && (
              <div className="absolute inset-0 z-20 flex items-center justify-center p-3 sm:p-6" onClick={closeWindow}>
                <div
                  className="flex flex-col w-full h-full max-w-[1400px] rounded-2xl border border-[var(--border-2)] shadow-2xl overflow-hidden backdrop-blur-xl"
                  style={{ background: 'linear-gradient(180deg, rgba(20,12,38,0.96), rgba(10,6,19,0.96))' }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[var(--border)] bg-white/[0.02] flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--grad)' }} />
                      <span className="text-sm font-semibold text-white">{titleFor(pathname)}</span>
                    </div>
                    <button
                      onClick={closeWindow}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--muted)] hover:text-white bg-white/[0.04] hover:bg-white/[0.09] border border-[var(--border)] transition-all"
                    >
                      🏢 Voltar ao escritório
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto p-6">{children}</div>
                </div>
              </div>
            )}

            {/* Avatar selection overlay (once per session) */}
            {showSelect && <AvatarSelect session={session} onEnter={handleEnter} />}

            {/* Enter-meeting button — shown only in the office area itself. No mic /
                raise-hand here: people only talk once inside the meeting room. */}
            {!showSelect && !overlayOpen && (
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30">
                <button onClick={enterMeeting} title="Entrar na reunião"
                  className="h-11 px-5 rounded-full flex items-center gap-2 text-white text-sm font-semibold shadow-xl transition-all hover:brightness-110 active:scale-95"
                  style={{ background: 'var(--grad)' }}>
                  📹 Entrar na reunião
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </CallProvider>
  )
}
