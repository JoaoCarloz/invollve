'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { UserSession, PERMISSIONS } from '@/lib/auth'

const navItems = [
  { href: '/dashboard', label: 'Início', icon: '🏠', module: null },
  { href: '/dashboard/escritorio', label: 'Escritório', icon: '🏢', module: null },
  { href: '/dashboard/financeiro', label: 'Financeiro', icon: '💰', module: 'financeiro' },
  { href: '/dashboard/comercial', label: 'Comercial', icon: '🚀', module: 'clientes' },
  { href: '/dashboard/clientes', label: 'Clientes', icon: '👥', module: 'clientes' },
  { href: '/dashboard/tarefas', label: 'Tarefas', icon: '✅', module: 'tarefas' },
  { href: '/dashboard/performance', label: 'Performance', icon: '📈', module: 'clientes' },
  { href: '/dashboard/rh', label: 'RH & Equipe', icon: '🎂', module: 'rh' },
  { href: '/dashboard/drive', label: 'Drive', icon: '📁', module: 'drive' },
  { href: '/dashboard/reunioes', label: 'Reuniões', icon: '📅', module: 'reunioes' },
  { href: '/dashboard/processos', label: 'Processos', icon: '⚙️', module: 'processos' },
  { href: '/dashboard/joao', label: 'João (IA)', icon: '🧑‍💼', module: null },
  { href: '/dashboard/agentes', label: 'Agentes de IA', icon: '🤖', module: 'agentes' },
  { href: '/dashboard/chat', label: 'Chat', icon: '💬', module: 'tarefas' },
  { href: '/dashboard/usuarios', label: 'Usuários', icon: '🔧', module: 'usuarios' },
  { href: '/dashboard/perfil', label: 'Meu Perfil', icon: '👤', module: null },
]

export default function Sidebar({ session }: { session: UserSession }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const visibleItems = navItems.filter(item =>
    item.module === null || PERMISSIONS[item.module]?.includes(session.role)
  )

  const initials = session.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  return (
    <aside className={`relative flex flex-col border-r border-[var(--border)] transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}
      style={{ background: 'linear-gradient(180deg, #150c2a 0%, #0b0716 100%)' }}>
      {/* Header */}
      <div className="p-3 border-b border-[var(--border)] flex items-center justify-between gap-2">
        {!collapsed && (
          <img src="/logo.png" alt="Invollve" className="h-7 object-contain" />
        )}
        {collapsed && (
          <div className="w-8 h-8 mx-auto rounded-lg flex items-center justify-center shadow-lg"
            style={{ background: 'var(--grad)' }}>
            <span className="text-white text-xs font-black">I</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="ml-auto flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {visibleItems.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined}
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${collapsed ? 'justify-center' : ''} ${active
                ? 'text-white font-medium'
                : 'text-[var(--muted)] hover:text-white hover:bg-white/[0.05]'}`}
              style={active ? { background: 'var(--grad-soft)' } : undefined}>
              {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full" style={{ background: 'var(--grad)' }} />}
              <span className={`text-base flex-shrink-0 transition-transform ${active ? 'scale-110' : 'group-hover:scale-105 opacity-80 group-hover:opacity-100'}`}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-[var(--border)]">
        <div className={`flex items-center gap-2.5 px-2 py-2 mb-1 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-white text-[11px] font-bold shadow-md ring-2 ring-white/10"
            style={{ background: 'var(--grad)' }}>{initials}</div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate leading-tight">{session.name}</p>
              <p className="text-xs text-[var(--muted)] truncate">{session.email}</p>
            </div>
          )}
        </div>
        <button onClick={logout} title={collapsed ? 'Sair' : undefined}
          className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--muted)] hover:bg-white/[0.05] hover:text-white transition-all ${collapsed ? 'justify-center' : ''}`}>
          <span className="flex-shrink-0 opacity-80">🚪</span>
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  )
}
