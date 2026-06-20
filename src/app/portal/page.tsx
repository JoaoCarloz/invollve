import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import db from '@/lib/db'
import LogoutButton from './LogoutButton'

export default async function PortalPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const client = await db.get<any>('SELECT * FROM clients WHERE email = ?', [session.email])
  const clientData = client
    ? await db.all<any>('SELECT * FROM client_data WHERE client_id = ? ORDER BY metric', [client.id])
    : []

  return (
    <div className="min-h-screen bg-[#0f0f13] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black"
              style={{ background: 'linear-gradient(135deg, #6c3de8, #ec4899)' }}>
              I
            </div>
            <div>
              <p className="font-black text-white">INVOLLVE</p>
              <p className="text-xs text-zinc-500">Portal do Cliente</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-zinc-400 text-sm">Olá, {session.name}</span>
            <LogoutButton />
          </div>
        </div>

        {client ? (
          <>
            <div className="glass rounded-2xl p-6 mb-6">
              <h1 className="text-xl font-black text-white mb-1">{client.name}</h1>
              {client.company && <p className="text-zinc-400">{client.company}</p>}
            </div>

            <h2 className="text-lg font-bold text-white mb-4">📊 Dados de Marketing</h2>
            {clientData.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {clientData.map((d: any) => (
                  <div key={d.id} className="glass rounded-2xl p-4">
                    <p className="text-xs text-zinc-400 mb-1">{d.metric}</p>
                    <p className="text-2xl font-black text-white">{d.value}</p>
                    {d.period && <p className="text-xs text-zinc-500 mt-1">{d.period}</p>}
                    {d.notes && <p className="text-xs text-zinc-600 mt-2">{d.notes}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass rounded-2xl p-8 text-center">
                <p className="text-zinc-500">Nenhum dado disponível ainda.</p>
                <p className="text-zinc-600 text-sm mt-1">Em breve sua agência publicará os resultados aqui.</p>
              </div>
            )}
          </>
        ) : (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-2xl mb-3">👋</p>
            <p className="text-white font-semibold">Bem-vindo ao seu portal!</p>
            <p className="text-zinc-400 text-sm mt-2">Seus dados de marketing serão exibidos aqui em breve.</p>
          </div>
        )}
      </div>
    </div>
  )
}
