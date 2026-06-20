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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white">Olá, {session?.name?.split(' ')[0]}! 👋</h1>
        <p className="text-zinc-400 mt-1">Aqui está o resumo da sua agência hoje.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="glass rounded-2xl p-5">
          <p className="text-zinc-400 text-sm">Clientes Ativos</p>
          <p className="text-3xl font-black text-white mt-1">{totalClients}</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-zinc-400 text-sm">Tarefas Pendentes</p>
          <p className="text-3xl font-black text-white mt-1">{totalTasks}</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-zinc-400 text-sm">Reuniões Agendadas</p>
          <p className="text-3xl font-black text-white mt-1">{upcomingMeetings.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {todoBirthdays.length > 0 && (
          <div className="glass rounded-2xl p-5">
            <h2 className="font-bold text-white mb-4">🎂 Aniversários nos próximos 30 dias</h2>
            <div className="space-y-3">
              {todoBirthdays.map((p: any) => (
                <div key={p.name} className="flex items-center justify-between">
                  <span className="text-white text-sm">{p.name}</span>
                  <span className="text-zinc-400 text-xs">{new Date(p.birthday + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {upcomingMeetings.length > 0 && (
          <div className="glass rounded-2xl p-5">
            <h2 className="font-bold text-white mb-4">📅 Próximas Reuniões</h2>
            <div className="space-y-3">
              {upcomingMeetings.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between">
                  <span className="text-white text-sm">{m.title}</span>
                  <span className="text-zinc-400 text-xs">{new Date(m.start_time).toLocaleDateString('pt-BR')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
