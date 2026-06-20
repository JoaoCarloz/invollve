'use client'
import { useEffect, useState } from 'react'

const emptyForm = { name: '', role: '', birthday: '', email: '', phone: '', notes: '' }

function daysUntilBirthday(birthday: string): number | null {
  if (!birthday) return null
  const today = new Date()
  const bday = new Date(birthday + 'T00:00:00')
  const next = new Date(today.getFullYear(), bday.getMonth(), bday.getDate())
  if (next < today) next.setFullYear(today.getFullYear() + 1)
  return Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export default function RhPage() {
  const [people, setPeople] = useState<any[]>([])
  const [form, setForm] = useState({ ...emptyForm })
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)

  async function load() {
    const data = await fetch('/api/rh').then(r => r.json())
    setPeople(Array.isArray(data) ? data : [])
  }
  useEffect(() => { load() }, [])

  async function save() {
    const method = editId ? 'PUT' : 'POST'
    const body = editId ? { ...form, id: editId } : form
    await fetch('/api/rh', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setForm({ ...emptyForm }); setShowForm(false); setEditId(null); load()
  }

  async function remove(id: number) {
    if (!confirm('Excluir pessoa?')) return
    await fetch('/api/rh', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  const upcoming = people
    .filter(p => p.birthday)
    .map(p => ({ ...p, daysUntil: daysUntilBirthday(p.birthday) }))
    .filter(p => p.daysUntil !== null && p.daysUntil! <= 30)
    .sort((a, b) => a.daysUntil! - b.daysUntil!)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">🎂 RH & Equipe</h1>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ ...emptyForm }) }}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #6c3de8, #ec4899)' }}>
          + Cadastrar Pessoa
        </button>
      </div>

      {upcoming.length > 0 && (
        <div className="glass rounded-2xl p-5 mb-6 border border-yellow-500/20">
          <h2 className="font-bold text-yellow-400 mb-3">🎉 Aniversários em breve!</h2>
          <div className="flex flex-wrap gap-3">
            {upcoming.map(p => (
              <div key={p.id} className="bg-yellow-500/10 rounded-xl px-3 py-2">
                <p className="text-white text-sm font-medium">{p.name}</p>
                <p className="text-yellow-400 text-xs">{p.daysUntil === 0 ? '🎂 Hoje!' : `Em ${p.daysUntil} dias`}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="glass rounded-2xl p-6 w-full max-w-lg">
            <h2 className="font-bold text-white mb-4">{editId ? 'Editar' : 'Cadastrar'} Pessoa</h2>
            <div className="space-y-3">
              <input placeholder="Nome *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
              <input placeholder="Cargo / Função" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Data de Aniversário</label>
                <input type="date" value={form.birthday} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
              </div>
              <input placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
              <input placeholder="Telefone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
              <textarea placeholder="Observações" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" rows={2} />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={save} className="flex-1 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #6c3de8, #ec4899)' }}>Salvar</button>
              <button onClick={() => { setShowForm(false); setEditId(null) }} className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-white bg-white/5">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {people.map(p => {
          const days = daysUntilBirthday(p.birthday)
          return (
            <div key={p.id} className="glass rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-white">{p.name}</p>
                  {p.role && <p className="text-xs text-zinc-400">{p.role}</p>}
                </div>
                {days !== null && days <= 7 && (
                  <span className="text-yellow-400 text-lg">🎂</span>
                )}
              </div>
              {p.birthday && <p className="text-xs text-zinc-400 mb-1">🎂 {new Date(p.birthday + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}{days !== null && ` (em ${days} dias)`}</p>}
              {p.email && <p className="text-xs text-zinc-400 mb-1">✉️ {p.email}</p>}
              {p.phone && <p className="text-xs text-zinc-400 mb-1">📞 {p.phone}</p>}
              <div className="flex gap-2 mt-3">
                <button onClick={() => { setEditId(p.id); setForm({ name: p.name, role: p.role || '', birthday: p.birthday || '', email: p.email || '', phone: p.phone || '', notes: p.notes || '' }); setShowForm(true) }} className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded bg-white/5">✏️ Editar</button>
                <button onClick={() => remove(p.id)} className="text-xs text-zinc-400 hover:text-red-400 px-2 py-1 rounded bg-white/5">🗑️</button>
              </div>
            </div>
          )
        })}
        {people.length === 0 && <p className="text-zinc-500 col-span-3 text-center py-8">Nenhuma pessoa cadastrada</p>}
      </div>
    </div>
  )
}
