'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { UserSession, PERMISSIONS } from '@/lib/auth'

type Item = { href: string; label: string; icon: IconName; module: string | null }
const NAV: { section: string | null; items: Item[] }[] = [
  { section: null, items: [
    { href: '/dashboard', label: 'Início', icon: 'home', module: null },
    { href: '/dashboard/escritorio', label: 'Escritório', icon: 'building', module: null },
  ] },
  { section: 'Gestão', items: [
    { href: '/dashboard/financeiro', label: 'Financeiro', icon: 'wallet', module: 'financeiro' },
    { href: '/dashboard/comercial', label: 'Comercial', icon: 'trending', module: 'clientes' },
    { href: '/dashboard/clientes', label: 'Clientes', icon: 'users', module: 'clientes' },
    { href: '/dashboard/tarefas', label: 'Tarefas', icon: 'check', module: 'tarefas' },
    { href: '/dashboard/performance', label: 'Performance', icon: 'chart', module: 'clientes' },
    { href: '/dashboard/reunioes', label: 'Reuniões', icon: 'calendar', module: 'reunioes' },
    { href: '/dashboard/drive', label: 'Drive', icon: 'folder', module: 'drive' },
    { href: '/dashboard/processos', label: 'Processos', icon: 'settings', module: 'processos' },
  ] },
  { section: 'Equipe & IA', items: [
    { href: '/dashboard/rh', label: 'RH & Equipe', icon: 'gift', module: 'rh' },
    { href: '/dashboard/chat', label: 'Chat', icon: 'chat', module: 'tarefas' },
    { href: '/dashboard/joao', label: 'João (IA)', icon: 'sparkles', module: null },
    { href: '/dashboard/agentes', label: 'Agentes de IA', icon: 'cpu', module: 'agentes' },
  ] },
  { section: 'Conta', items: [
    { href: '/dashboard/usuarios', label: 'Usuários', icon: 'shield', module: 'usuarios' },
    { href: '/dashboard/perfil', label: 'Meu Perfil', icon: 'user', module: null },
  ] },
]

export default function Sidebar({ session }: { session: UserSession }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const can = (m: string | null) => m === null || PERMISSIONS[m]?.includes(session.role)
  const groups = NAV
    .map(g => ({ ...g, items: g.items.filter(i => can(i.module)) }))
    .filter(g => g.items.length > 0)

  const initials = session.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  return (
    <aside className={`relative flex flex-col border-r border-[var(--border)] transition-all duration-300 ${collapsed ? 'w-[68px]' : 'w-64'}`}
      style={{ background: 'linear-gradient(180deg, #150c2a 0%, #0b0716 100%)' }}>
      {/* Header — full light panel with the brand logo in its original colours */}
      <div className="h-14 px-3 flex items-center justify-between gap-2 flex-shrink-0 shadow-sm" style={{ background: 'var(--brand-light)' }}>
        {!collapsed
          ? <img src="/logo.png" alt="Invollve" className="h-6 object-contain" />
          : <div className="w-9 h-9 mx-auto rounded-xl flex items-center justify-center shadow-md" style={{ background: 'var(--grad)' }}>
              <span className="text-white text-sm font-black">I</span>
            </div>}
        <button onClick={() => setCollapsed(c => !c)}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[var(--brand-deep)] hover:bg-black/10 transition-all"
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}>
          <Chevron dir={collapsed ? 'right' : 'left'} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {groups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
            {group.section && (
              collapsed
                ? <div className="mx-3 my-2 border-t border-white/[0.06]" />
                : <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]/60">{group.section}</p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                return (
                  <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined}
                    className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${collapsed ? 'justify-center' : ''} ${active
                      ? 'text-white font-medium'
                      : 'text-[var(--muted)] hover:text-white hover:bg-white/[0.045]'}`}
                    style={active ? { background: 'rgba(157,123,255,0.12)' } : undefined}>
                    {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full" style={{ background: 'var(--grad)' }} />}
                    <span className={`flex-shrink-0 transition-colors ${active ? 'text-[var(--accent)]' : 'text-current opacity-80 group-hover:opacity-100'}`}>
                      <Icon name={item.icon} />
                    </span>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-[var(--border)] flex-shrink-0">
        <div className={`flex items-center gap-2.5 px-2 py-2 mb-0.5 ${collapsed ? 'justify-center' : ''}`}>
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
          className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--muted)] hover:bg-white/[0.045] hover:text-white transition-colors ${collapsed ? 'justify-center' : ''}`}>
          <span className="flex-shrink-0 opacity-80"><Icon name="logout" /></span>
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  )
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      {dir === 'right' ? <polyline points="9 18 15 12 9 6" /> : <polyline points="15 18 9 12 15 6" />}
    </svg>
  )
}

type IconName = 'home' | 'building' | 'wallet' | 'trending' | 'users' | 'check' | 'chart' | 'calendar'
  | 'folder' | 'settings' | 'gift' | 'chat' | 'sparkles' | 'cpu' | 'shield' | 'user' | 'logout'

function Icon({ name }: { name: IconName }) {
  const p = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'home': return <svg {...p}><path d="M3 9.5 12 3l9 6.5" /><path d="M5 9v11h14V9" /><path d="M10 20v-6h4v6" /></svg>
    case 'building': return <svg {...p}><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M9 7h2M13 7h2M9 11h2M13 11h2M10 21v-3h4v3" /></svg>
    case 'wallet': return <svg {...p}><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M3 8V6.5A1.5 1.5 0 0 1 4.5 5H16" /><circle cx="16.5" cy="13" r="1.2" /></svg>
    case 'trending': return <svg {...p}><polyline points="3 17 9 11 13 15 21 7" /><polyline points="15 7 21 7 21 13" /></svg>
    case 'users': return <svg {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="3.5" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.3A4 4 0 0 1 16 11" /></svg>
    case 'check': return <svg {...p}><path d="M21 11v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /><polyline points="9 11 12 14 21 5" /></svg>
    case 'chart': return <svg {...p}><line x1="6" y1="20" x2="6" y2="12" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="18" y1="20" x2="18" y2="9" /></svg>
    case 'calendar': return <svg {...p}><rect x="3" y="4.5" width="18" height="16.5" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="8" y1="2.5" x2="8" y2="6" /><line x1="16" y1="2.5" x2="16" y2="6" /></svg>
    case 'folder': return <svg {...p}><path d="M3 7a2 2 0 0 1 2-2h3.5l2 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
    case 'settings': return <svg {...p}><circle cx="12" cy="12" r="3.2" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.1 5.1l2.1 2.1M16.8 16.8l2.1 2.1M18.9 5.1l-2.1 2.1M7.2 16.8l-2.1 2.1" /></svg>
    case 'gift': return <svg {...p}><rect x="3" y="8" width="18" height="4.5" rx="1" /><path d="M5 12.5V21h14v-8.5M12 8v13" /><path d="M12 8S10.5 3.5 8 4.8 9.5 8 12 8zM12 8s1.5-4.5 4-3.2S14.5 8 12 8z" /></svg>
    case 'chat': return <svg {...p}><path d="M21 14.5a2 2 0 0 1-2 2H8l-4 3.5V6a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" /></svg>
    case 'sparkles': return <svg {...p}><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" /><path d="M18.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" /></svg>
    case 'cpu': return <svg {...p}><rect x="5" y="5" width="14" height="14" rx="2" /><rect x="9" y="9" width="6" height="6" rx="1" /><path d="M9 2.5v2M15 2.5v2M9 19.5v2M15 19.5v2M2.5 9h2M2.5 15h2M19.5 9h2M19.5 15h2" /></svg>
    case 'shield': return <svg {...p}><path d="M12 2.5l8 3v6c0 4.8-3.4 8.3-8 9.8-4.6-1.5-8-5-8-9.8v-6z" /><polyline points="9 12 11 14 15 9.5" /></svg>
    case 'user': return <svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 20.5v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></svg>
    case 'logout': return <svg {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
  }
}
