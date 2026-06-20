'use client'
import { useEffect, useState, useMemo } from 'react'

type Entry = { id: number; type: string; description: string; amount: number; category: string; status: string; due_date: string; client_name: string }

const emptyForm = { type: 'entrada', description: '', amount: '', category: '', status: 'pendente', due_date: '', client_id: '' }

const MONTHS = [
  { value: '01', label: 'Janeiro' }, { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' }, { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' }, { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' }, { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' }, { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' },
]

const STATUS_CYCLE: Record<string, string> = { pendente: 'pago', pago: 'cancelado', cancelado: 'pendente' }
const STATUS_STYLE: Record<string, string> = {
  pago: 'bg-green-500/20 text-green-400 border border-green-500/30',
  cancelado: 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30',
  pendente: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
}
const STATUS_LABEL: Record<string, string> = { pago: 'Pago ✓', cancelado: 'Cancelado', pendente: 'Pendente' }

function fmt(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }

export default function FinanceiroPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [form, setForm] = useState({ ...emptyForm })
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [toggling, setToggling] = useState<number | null>(null)

  const now = new Date()
  const [selYear, setSelYear] = useState(String(now.getFullYear()))
  const [selMonth, setSelMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'))

  async function load() {
    const [e, c] = await Promise.all([
      fetch('/api/financial').then(r => r.json()),
      fetch('/api/clients').then(r => r.json()),
    ])
    setEntries(Array.isArray(e) ? e : [])
    setClients(Array.isArray(c) ? c : [])
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (!e.due_date) return false
      const [y, m] = e.due_date.split('-')
      return y === selYear && m === selMonth
    })
  }, [entries, selYear, selMonth])

  const entradas = filtered.filter(e => e.type === 'entrada').reduce((a, e) => a + e.amount, 0)
  const despesas = filtered.filter(e => e.type === 'despesa').reduce((a, e) => a + e.amount, 0)
  const margem = entradas - despesas
  const margemPct = entradas > 0 ? (margem / entradas) * 100 : 0
  const aReceber = filtered.filter(e => e.type === 'entrada' && e.status === 'pendente').reduce((a, e) => a + e.amount, 0)

  const years = useMemo(() => {
    const ys = new Set(entries.map(e => e.due_date?.split('-')[0]).filter(Boolean))
    ys.add(String(now.getFullYear()))
    return Array.from(ys).sort()
  }, [entries])

  async function save() {
    const method = editId ? 'PUT' : 'POST'
    const body = editId ? { ...form, id: editId, amount: Number(form.amount) } : { ...form, amount: Number(form.amount) }
    await fetch('/api/financial', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setForm({ ...emptyForm }); setShowForm(false); setEditId(null); load()
  }

  async function remove(id: number) {
    if (!confirm('Excluir este lançamento?')) return
    await fetch('/api/financial', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  async function toggleStatus(e: Entry) {
    setToggling(e.id)
    const nextStatus = STATUS_CYCLE[e.status] || 'pendente'
    await fetch('/api/financial', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: e.id, type: e.type, description: e.description, amount: e.amount, category: e.category, status: nextStatus, due_date: e.due_date })
    })
    await load()
    setToggling(null)
  }

  async function toggleType(e: Entry) {
    setToggling(e.id)
    const nextType = e.type === 'entrada' ? 'despesa' : 'entrada'
    await fetch('/api/financial', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: e.id, type: nextType, description: e.description, amount: e.amount, category: e.category, status: e.status, due_date: e.due_date })
    })
    await load()
    setToggling(null)
  }

  const monthLabel = MONTHS.find(m => m.value === selMonth)?.label

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">💰 Financeiro</h1>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ ...emptyForm }) }}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #6c3de8, #ec4899)' }}>
          + Novo Lançamento
        </button>
      </div>

      {/* Filtro mês/ano */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-zinc-400 text-sm">Visualizando:</span>
        <select value={selMonth} onChange={e => setSelMonth(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm">
          {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select value={selYear} onChange={e => setSelYear(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass rounded-2xl p-5">
          <p className="text-zinc-400 text-sm">Entradas — {monthLabel}</p>
          <p className="text-2xl font-black text-green-400">R$ {fmt(entradas)}</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-zinc-400 text-sm">Despesas — {monthLabel}</p>
          <p className="text-2xl font-black text-red-400">R$ {fmt(despesas)}</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-zinc-400 text-sm">Margem — {monthLabel}</p>
          <p className={`text-2xl font-black ${margem >= 0 ? 'text-purple-400' : 'text-red-400'}`}>R$ {fmt(margem)}</p>
          <p className={`text-xs mt-1 ${margem >= 0 ? 'text-purple-300' : 'text-red-300'}`}>{margemPct.toFixed(1)}% das entradas</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-zinc-400 text-sm">A Receber</p>
          <p className="text-2xl font-black text-yellow-400">R$ {fmt(aReceber)}</p>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="glass rounded-2xl p-6 w-full max-w-lg">
            <h2 className="font-bold text-white mb-4">{editId ? 'Editar' : 'Novo'} Lançamento</h2>
            <div className="space-y-3">
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm">
                <option value="entrada">Entrada</option>
                <option value="despesa">Despesa</option>
              </select>
              <input placeholder="Descrição" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
              <input type="number" placeholder="Valor" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
              <input placeholder="Categoria" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm">
                <option value="pendente">Pendente</option>
                <option value="pago">Pago/Recebido</option>
                <option value="cancelado">Cancelado</option>
              </select>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
              <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm">
                <option value="">Sem cliente vinculado</option>
                {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={save} className="flex-1 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #6c3de8, #ec4899)' }}>Salvar</button>
              <button onClick={() => { setShowForm(false); setEditId(null) }} className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-white bg-white/5">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
          <span className="text-xs text-zinc-500">💡 Clique no badge de</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Status</span>
          <span className="text-xs text-zinc-500">ou</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400 border border-green-500/30">Tipo</span>
          <span className="text-xs text-zinc-500">para alterar direto</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Descrição</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Tipo</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Valor</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Vencimento</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Cliente</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id} className={`border-b border-white/5 hover:bg-white/2 transition-opacity ${toggling === e.id ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 text-white">{e.description}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleType(e)}
                    title="Clique para alternar tipo"
                    className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-all hover:scale-105 active:scale-95 border ${e.type === 'entrada' ? 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30'}`}>
                    {e.type === 'entrada' ? '↑ entrada' : '↓ despesa'}
                  </button>
                </td>
                <td className={`px-4 py-3 font-semibold ${e.type === 'entrada' ? 'text-green-400' : 'text-red-400'}`}>
                  R$ {fmt(e.amount)}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleStatus(e)}
                    title="Clique para avançar status"
                    className={`px-2 py-0.5 rounded-full text-xs cursor-pointer transition-all hover:scale-105 active:scale-95 ${STATUS_STYLE[e.status] || STATUS_STYLE.pendente}`}>
                    {STATUS_LABEL[e.status] || e.status}
                  </button>
                </td>
                <td className="px-4 py-3 text-zinc-400">{e.due_date ? new Date(e.due_date + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</td>
                <td className="px-4 py-3 text-zinc-400">{e.client_name || '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => { setEditId(e.id); setForm({ type: e.type, description: e.description, amount: String(e.amount), category: e.category, status: e.status, due_date: e.due_date || '', client_id: '' }); setShowForm(true) }} className="text-xs text-zinc-400 hover:text-white">✏️</button>
                    <button onClick={() => remove(e.id)} className="text-xs text-zinc-400 hover:text-red-400">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-zinc-500 py-8">Nenhum lançamento em {monthLabel} de {selYear}</p>}
      </div>
    </div>
  )
}
