'use client'
import { useEffect, useState } from 'react'

const emptyForm = { name: '', url: '', category: '', client_id: '' }
const CATEGORIES = ['Geral', 'Criativos', 'Relatórios', 'Contratos', 'Estratégia', 'Financeiro', 'Outros']

export default function DrivePage() {
  const [links, setLinks] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [form, setForm] = useState({ ...emptyForm })
  const [showForm, setShowForm] = useState(false)
  const [filterCat, setFilterCat] = useState('')

  async function load() {
    const [l, c] = await Promise.all([
      fetch('/api/drive').then(r => r.json()),
      fetch('/api/clients').then(r => r.json()),
    ])
    setLinks(Array.isArray(l) ? l : [])
    setClients(Array.isArray(c) ? c : [])
  }
  useEffect(() => { load() }, [])

  async function save() {
    await fetch('/api/drive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setForm({ ...emptyForm }); setShowForm(false); load()
  }

  async function remove(id: number) {
    if (!confirm('Remover link?')) return
    await fetch('/api/drive', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  const filtered = filterCat ? links.filter((l: any) => l.category === filterCat) : links
  const grouped = filtered.reduce((acc: any, l: any) => {
    const key = l.category || 'Sem categoria'
    if (!acc[key]) acc[key] = []
    acc[key].push(l)
    return acc
  }, {})

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">📁 Drive</h1>
        <button onClick={() => setShowForm(true)}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #6c3de8, #ec4899)' }}>
          + Adicionar Pasta
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFilterCat('')} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${!filterCat ? 'bg-purple-600 text-white' : 'bg-white/5 text-zinc-400 hover:text-white'}`}>Todos</button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setFilterCat(filterCat === c ? '' : c)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${filterCat === c ? 'bg-purple-600 text-white' : 'bg-white/5 text-zinc-400 hover:text-white'}`}>{c}</button>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="glass rounded-2xl p-6 w-full max-w-lg">
            <h2 className="font-bold text-white mb-4">Adicionar Link do Drive</h2>
            <div className="space-y-3">
              <input placeholder="Nome da pasta *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
              <input placeholder="URL do Google Drive *" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm">
                <option value="">Categoria</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm">
                <option value="">Sem cliente (pasta geral)</option>
                {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={save} className="flex-1 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #6c3de8, #ec4899)' }}>Salvar</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-white bg-white/5">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {Object.entries(grouped).map(([cat, items]: any) => (
        <div key={cat} className="glass rounded-2xl p-5 mb-4">
          <h2 className="font-bold text-zinc-300 mb-3 text-sm">{cat}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {items.map((l: any) => (
              <div key={l.id} className="group bg-white/5 rounded-xl p-3 border border-white/5 hover:border-purple-500/30 transition">
                <div className="flex items-start justify-between">
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <div className="text-2xl mb-2">📂</div>
                    <p className="text-white text-sm font-medium group-hover:text-purple-300 transition">{l.name}</p>
                    {l.client_name && <p className="text-xs text-zinc-500 mt-1">👥 {l.client_name}</p>}
                  </a>
                  <button onClick={() => remove(l.id)} className="opacity-0 group-hover:opacity-100 text-xs text-zinc-500 hover:text-red-400 transition">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {links.length === 0 && <p className="text-zinc-500 text-center py-8">Nenhum link cadastrado</p>}
    </div>
  )
}
