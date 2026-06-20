'use client'
import { useEffect, useState } from 'react'

const STAGES = [
  { id: 'prospeccao', label: 'Prospecção', color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
  { id: 'contato', label: 'Contato Feito', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: 'proposta', label: 'Proposta Enviada', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { id: 'negociacao', label: 'Em Negociação', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { id: 'fechado', label: 'Fechado ✅', color: 'text-green-400', bg: 'bg-green-500/10' },
  { id: 'perdido', label: 'Perdido ❌', color: 'text-red-400', bg: 'bg-red-500/10' },
]

const emptyForm = { name: '', company: '', email: '', phone: '', stage: 'prospeccao', value: '', notes: '', responsible_id: '' }

export default function ComercialPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [form, setForm] = useState({ ...emptyForm })
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)

  async function load() {
    const [l, u] = await Promise.all([
      fetch('/api/comercial').then(r => r.json()),
      fetch('/api/users/list').then(r => r.json()),
    ])
    setLeads(Array.isArray(l) ? l : [])
    setUsers(Array.isArray(u) ? u : [])
  }
  useEffect(() => { load() }, [])

  async function save() {
    const method = editId ? 'PUT' : 'POST'
    const body = editId ? { ...form, id: editId, value: Number(form.value) || null } : { ...form, value: Number(form.value) || null }
    await fetch('/api/comercial', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setForm({ ...emptyForm }); setShowForm(false); setEditId(null); load()
  }

  async function moveStage(id: number, stage: string) {
    const lead = leads.find(l => l.id === id)
    if (!lead) return
    await fetch('/api/comercial', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...lead, id, stage }) })
    load()
  }

  async function remove(id: number) {
    if (!confirm('Excluir lead?')) return
    await fetch('/api/comercial', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  const totalValue = leads.filter(l => l.stage === 'fechado').reduce((a, l) => a + (l.value || 0), 0)
  const pipeline = leads.filter(l => !['fechado', 'perdido'].includes(l.stage)).reduce((a, l) => a + (l.value || 0), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">🚀 Comercial</h1>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ ...emptyForm }) }}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #6c3de8, #ec4899)' }}>
          + Novo Lead
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="glass rounded-2xl p-5">
          <p className="text-zinc-400 text-sm">Total Leads</p>
          <p className="text-3xl font-black text-white">{leads.length}</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-zinc-400 text-sm">Pipeline (em aberto)</p>
          <p className="text-2xl font-black text-yellow-400">R$ {pipeline.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-zinc-400 text-sm">Fechados</p>
          <p className="text-2xl font-black text-green-400">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="glass rounded-2xl p-6 w-full max-w-lg">
            <h2 className="font-bold text-white mb-4">{editId ? 'Editar' : 'Novo'} Lead</h2>
            <div className="space-y-3">
              <input placeholder="Nome do contato *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
              <input placeholder="Empresa" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
                <input placeholder="Telefone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm">
                  {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <input type="number" placeholder="Valor do contrato" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
              </div>
              <select value={form.responsible_id} onChange={e => setForm(f => ({ ...f, responsible_id: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm">
                <option value="">Sem responsável</option>
                {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <textarea placeholder="Observações" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" rows={2} />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={save} className="flex-1 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #6c3de8, #ec4899)' }}>Salvar</button>
              <button onClick={() => { setShowForm(false); setEditId(null) }} className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-white bg-white/5">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 xl:grid-cols-6 gap-3">
        {STAGES.map(stage => (
          <div key={stage.id} className="glass rounded-2xl p-3">
            <h2 className={`font-bold text-xs mb-3 ${stage.color}`}>{stage.label} ({leads.filter(l => l.stage === stage.id).length})</h2>
            <div className="space-y-2">
              {leads.filter(l => l.stage === stage.id).map(lead => (
                <div key={lead.id} className={`rounded-xl p-3 border border-white/5 ${stage.bg}`}>
                  <p className="text-white text-xs font-semibold">{lead.name}</p>
                  {lead.company && <p className="text-zinc-400 text-xs">{lead.company}</p>}
                  {lead.value && <p className={`text-xs font-bold mt-1 ${stage.color}`}>R$ {Number(lead.value).toLocaleString('pt-BR')}</p>}
                  {lead.responsible_name && <p className="text-zinc-500 text-xs mt-1">👤 {lead.responsible_name}</p>}
                  <div className="flex gap-1 mt-2">
                    <button onClick={() => { setEditId(lead.id); setForm({ name: lead.name, company: lead.company || '', email: lead.email || '', phone: lead.phone || '', stage: lead.stage, value: String(lead.value || ''), notes: lead.notes || '', responsible_id: String(lead.responsible_id || '') }); setShowForm(true) }} className="text-zinc-500 hover:text-white text-xs">✏️</button>
                    <button onClick={() => remove(lead.id)} className="text-zinc-500 hover:text-red-400 text-xs">🗑️</button>
                  </div>
                  <select value={lead.stage} onChange={e => moveStage(lead.id, e.target.value)} className="mt-2 w-full text-xs bg-black/20 border border-white/10 rounded-lg px-1 py-1 text-zinc-300">
                    {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
              ))}
              {leads.filter(l => l.stage === stage.id).length === 0 && <p className="text-zinc-700 text-xs text-center py-3">—</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
