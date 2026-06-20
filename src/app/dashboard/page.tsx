import { getSession } from '@/lib/session'
import db from '@/lib/db'

export default async function DashboardHome() {
  const session = await getSession()
  const totalClientsRow = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM clients')
  const totalClients = totalClientsRow?.c ?? 0
  const totalTasksRow = await db.get<{ c: number }>(`SELECT COUNT(*) as c FROM tasks WHERE status != 'done'`)
  const totalTasks = totalTasksRow?.c ?? 0
  const todoBirthdays = await db.all(`
    SELECT name, birthday FROM rh_people
    WHERE birthday IS NOT NULL AND birthday != ''
    AND strftime('%m-%d', birthday) >= strftime('%m-%d', 'now')
    AND strftime('%m-%d', birthday) <= strftime('%m-%d', 'now', '+30 days')
    ORDER BY strftime('%m-%d', birthday)
    LIMIT 5
  `) as any[]

  const upcomingMeetings = await db.all(`
    SELECT * FROM meetings WHERE start_time >= datetime('now') ORDER BY start_time LIMIT 3
  `) as any[]

  const stats = [
    { label: 'Clientes Ativos', value: totalClients, icon: '👥' },
    { label: 'Tarefas Pendentes', value: totalTasks, icon: '✅' },
    { label: 'Reuniões Agendadas', value: upcomingMeetings.length, icon: '📅' },
  ]

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-[26px] font-black tracking-tight text-white">
          Olá, <span className="gradient-text">{session?.name?.split(' ')[0]}</span>! 👋
        </h1>
        <p className="text-[var(--muted)] mt-1">Aqui está o resumo da sua agência hoje.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="card card-hover p-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-[var(--muted)] text-sm">{s.label}</p>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: 'var(--grad-soft)' }}>{s.icon}</div>
            </div>
            <p className="text-4xl font-black text-white mt-3 tracking-tight">{s.value}</p>
            <span className="absolute left-0 bottom-0 h-[3px] w-full opacity-70" style={{ background: 'var(--grad)' }} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {todoBirthdays.length > 0 && (
          <div className="card p-5">
            <h2 className="font-bold text-white mb-4 flex items-center gap-2"><span>🎂</span> Aniversários nos próximos 30 dias</h2>
            <div className="space-y-1">
              {todoBirthdays.map((p: any) => (
                <div key={p.name} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-white/[0.04] transition-colors">
                  <span className="text-white text-sm">{p.name}</span>
                  <span className="text-[var(--muted)] text-xs">{new Date(p.birthday + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {upcomingMeetings.length > 0 && (
          <div className="card p-5">
            <h2 className="font-bold text-white mb-4 flex items-center gap-2"><span>📅</span> Próximas Reuniões</h2>
            <div className="space-y-1">
              {upcomingMeetings.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-white/[0.04] transition-colors">
                  <span className="text-white text-sm">{m.title}</span>
                  <span className="text-[var(--muted)] text-xs">{new Date(m.start_time).toLocaleDateString('pt-BR')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
