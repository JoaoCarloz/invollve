'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { UserSession } from '@/lib/auth'
import OfficeCanvas from './OfficeCanvas'
import OfficeCall from './OfficeCall'
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

export default function OfficeShell({ session, children }: { session: UserSession; children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const overlayOpen = pathname !== OFFICE_PATH

  // Avatar selection shown once per session on first enter
  const [showSelect, setShowSelect] = useState(false)
  const [avatarColor, setAvatarColor] = useState<string>('')

  useEffect(() => {
    setAvatarColor(getAvatarColor(session.role))
    setShowSelect(shouldShowAvatarSelect())
  }, [session.role])

  function closeWindow() { router.push(OFFICE_PATH) }

  function handleEnter(color: string) {
    setAvatarColor(color)
    setShowSelect(false)
  }

  return (
    <div className="relative flex-1 h-screen overflow-hidden bg-[#08080c]">
      {/* Persistent office canvas */}
      <div className={`absolute inset-0 transition-all duration-300 ${overlayOpen ? 'scale-[0.99] blur-[2px] brightness-[0.55]' : ''}`}>
        <OfficeCanvas session={session} active={!overlayOpen && !showSelect} avatarColor={avatarColor} />
      </div>

      {/* Floating module window */}
      {overlayOpen && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-3 sm:p-6" onClick={closeWindow}>
          <div
            className="flex flex-col w-full h-full max-w-[1400px] rounded-2xl border border-white/10 bg-[#0f0f13] shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-white/5 bg-[#0a0a0e] flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500/80" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <span className="w-3 h-3 rounded-full bg-green-500/80" />
                </span>
                <span className="ml-2 text-sm font-semibold text-white">{titleFor(pathname)}</span>
              </div>
              <button
                onClick={closeWindow}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 transition-all"
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

      {/* A/V controls */}
      <OfficeCall session={session} />
    </div>
  )
}
