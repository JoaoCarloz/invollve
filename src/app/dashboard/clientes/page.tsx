'use client'
import { useEffect, useState } from 'react'

const emptyForm = { name: '', email: '', phone: '', company: '', notes: '', status: 'ativo' }

export default function ClientesPage() {
  const [clients, setClients] = useState<any[]>([])
  const [form, setForm] = useState({ ...emptyForm })
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  async function load() {
    const data = await fetch('/api/clients').then(r => r.json())
    setClients(Array.isArray(data) ? data : [])
  }
  useEffect(() => { load() }, [])

  async function save() {
    const method = editId ? 'PUT' : 'POST'
    const body = editId ? { ...form, id: editId } : form
    await fetch('/api/clients', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setForm({ ...emptyForm }); setShowForm(false); setEditId(null); load()
  }

  async function remove(id: number) {
    if (!confirm('Excluir este cliente?')) return
    await fetch('/api/clients', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.company || '').toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">👥 Clientes</h1>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ ...emptyForm }) }}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #6c3de8, #ec4899)' }}>
          + Novo Cliente
        </button>
      </div>

      <input placeholder="Buscar cliente ou empresa..." value={search} onChange={e => setSearch(e.target.value)}
        className="w-full mb-4 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="glass rounded-2xl p-6 w-full max-w-lg">
            <h2 className="font-bold text-white mb-4">{editId ? 'Editar' : 'Novo'} Cliente</h2>
            <div className="space-y-3">
              {[['name','Nome *'], ['email','Email'], ['phone','Telefone'], ['company','Empresa']].map(([key, label]) => (
                <input key={key} placeholder={label} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
              ))}
              <textarea placeholder="Observações" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" rows={3} />
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm">
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="prospecto">Prospecto</option>
              </select>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={save} className="flex-1 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #6c3de8, #ec4899)' }}>Salvar</button>
              <button onClick={() => { setShowForm(false); setEditId(null) }} className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-white bg-white/5">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(c => (
          <div key={c.id} className="glass rounded-2xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-white">{c.name}</p>
                {c.company && <p className="text-xs text-zinc-400">{c.company}</p>}
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs ${c.status === 'ativo' ? 'bg-green-500/20 text-green-400' : c.status === 'prospecto' ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-500/20 text-zinc-400'}`}>{c.status}</span>
            </div>
            {c.email && <p className="text-xs text-zinc-400 mb-1">✉️ {c.email}</p>}
            {c.phone && <p className="text-xs text-zinc-400 mb-1">📞 {c.phone}</p>}
            {c.notes && <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{c.notes}</p>}
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setEditId(c.id); setForm({ name: c.name, email: c.email || '', phone: c.phone || '', company: c.company || '', notes: c.notes || '', status: c.status }); setShowForm(true) }}
                className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded bg-white/5">✏️ Editar</button>
              <button onClick={() => remove(c.id)} className="text-xs text-zinc-400 hover:text-red-400 px-2 py-1 rounded bg-white/5">🗑️</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-zinc-500 col-span-3 text-center py-8">Nenhum cliente encontrado</p>}
      </div>
    </div>
  )
}
