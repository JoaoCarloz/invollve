'use client'
import { useEffect, useState } from 'react'

const emptyForm = { name: '', email: '', password: '', role: 'staff' }
const ROLES: Record<string, string> = {
  socio: 'Sócio',
  gestor_trafego: 'Gestor de Tráfego',
  social_media: 'Social Media',
  designer: 'Designer / Editor',
  cliente: 'Cliente',
  staff: 'Equipe',
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<any[]>([])
  const [form, setForm] = useState({ ...emptyForm })
  const [showForm, setShowForm] = useState(false)

  async function load() {
    const data = await fetch('/api/users').then(r => r.json())
    setUsers(Array.isArray(data) ? data : [])
  }
  useEffect(() => { load() }, [])

  async function save() {
    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (!res.ok) {
      const err = await res.json()
      alert(err.error)
      return
    }
    setForm({ ...emptyForm }); setShowForm(false); load()
  }

  async function remove(id: number) {
    if (!confirm('Excluir usuário?')) return
    await fetch('/api/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">⚙️ Usuários</h1>
        <button onClick={() => setShowForm(true)}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #6c3de8, #ec4899)' }}>
          + Novo Usuário
        </button>
      </div>

      <div className="glass rounded-2xl p-5 mb-6">
        <h2 className="font-semibold text-white mb-3 text-sm">Permissões por Perfil</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-zinc-400">
          <div><p className="text-purple-400 font-medium mb-1">Sócio</p><p>Acesso total a todos os módulos</p></div>
          <div><p className="text-blue-400 font-medium mb-1">Gestor de Tráfego</p><p>Clientes, Tarefas, Dados, RH, Drive, Reuniões</p></div>
          <div><p className="text-pink-400 font-medium mb-1">Social Media</p><p>Clientes, Tarefas, Dados, RH, Drive, Reuniões</p></div>
          <div><p className="text-yellow-400 font-medium mb-1">Designer / Editor</p><p>Clientes, Tarefas, Dados, RH, Drive, Reuniões</p></div>
          <div><p className="text-green-400 font-medium mb-1">Cliente</p><p>Apenas Portal do Cliente</p></div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="glass rounded-2xl p-6 w-full max-w-lg">
            <h2 className="font-bold text-white mb-4">Novo Usuário</h2>
            <div className="space-y-3">
              <input placeholder="Nome completo *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
              <input type="email" placeholder="Email *" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
              <input type="password" placeholder="Senha *" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm">
                {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={save} className="flex-1 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #6c3de8, #ec4899)' }}>Criar Usuário</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-white bg-white/5">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Nome</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Email</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Perfil</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Criado em</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-white/5">
                <td className="px-4 py-3 text-white font-medium">{u.name}</td>
                <td className="px-4 py-3 text-zinc-400">{u.email}</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs">{ROLES[u.role] || u.role}</span></td>
                <td className="px-4 py-3 text-zinc-500 text-xs">{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-3">
                  <button onClick={() => remove(u.id)} className="text-xs text-zinc-500 hover:text-red-400">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="text-zinc-500 text-center py-8">Nenhum usuário</p>}
      </div>
    </div>
  )
}
