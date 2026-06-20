'use client'
import { useEffect, useState } from 'react'

const COLUMNS = [
  { id: 'todo', label: 'A Fazer', color: 'text-zinc-400' },
  { id: 'in_progress', label: 'Em Andamento', color: 'text-blue-400' },
  { id: 'review', label: 'Em Revisão', color: 'text-yellow-400' },
  { id: 'done', label: 'Concluído', color: 'text-green-400' },
]

const DATE_FILTERS = [
  { id: 'all', label: 'Todas as datas' },
  { id: 'overdue', label: 'Atrasadas' },
  { id: 'today', label: 'Hoje' },
  { id: 'week', label: 'Esta semana' },
  { id: 'month', label: 'Este mês' },
  { id: 'none', label: 'Sem data' },
  { id: 'custom', label: 'Período personalizado' },
]

const emptyForm = { title: '', description: '', status: 'todo', priority: 'media', assigned_to: '', client_id: '', due_date: '' }

// Avatar com foto da pessoa (fallback para iniciais)
function Avatar({ name, url }: { name?: string; url?: string }) {
  if (url) return <img src={url} alt={name || ''} className="w-5 h-5 rounded-full object-cover border border-white/10" />
  const initials = name ? name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?'
  return <div className="w-5 h-5 rounded-full bg-purple-500/30 text-purple-200 text-[9px] flex items-center justify-center font-semibold shrink-0">{initials}</div>
}

export default function TarefasPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [form, setForm] = useState({ ...emptyForm })
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [draggedId, setDraggedId] = useState<number | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [showDateMenu, setShowDateMenu] = useState(false)

  async function load() {
    const [t, u, c] = await Promise.all([
      fetch('/api/tasks').then(r => r.json()),
      fetch('/api/users/list').then(r => r.json()),
      fetch('/api/clients').then(r => r.json()),
    ])
    setTasks(Array.isArray(t) ? t : [])
    setUsers(Array.isArray(u) ? u : [])
    setClients(Array.isArray(c) ? c : [])
  }
  useEffect(() => { load() }, [])

  async function save() {
    const method = editId ? 'PUT' : 'POST'
    const body = editId ? { ...form, id: editId } : form
    await fetch('/api/tasks', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setForm({ ...emptyForm }); setShowForm(false); setEditId(null); load()
  }

  async function moveTask(id: number, status: string) {
    const task = tasks.find(t => t.id === id)
    if (!task || task.status === status) return
    // atualização otimista (move o card na hora, sem esperar o servidor)
    setTasks(ts => ts.map(t => t.id === id ? { ...t, status } : t))
    await fetch('/api/tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...task, id, status }) })
    load()
  }

  function onDrop(colId: string) {
    setDragOverCol(null)
    if (draggedId != null) moveTask(draggedId, colId)
    setDraggedId(null)
  }

  // Filtro por data estilo ClickUp
  function matchesDate(task: any) {
    if (dateFilter === 'all') return true
    if (dateFilter === 'none') return !task.due_date
    if (!task.due_date) return false
    const d = new Date(task.due_date + 'T00:00:00')
    const today = new Date(); today.setHours(0, 0, 0, 0)
    if (dateFilter === 'today') return d.getTime() === today.getTime()
    if (dateFilter === 'overdue') return d < today
    if (dateFilter === 'week') {
      const start = new Date(today); start.setDate(today.getDate() - ((today.getDay() + 6) % 7)) // segunda
      const end = new Date(start); end.setDate(start.getDate() + 6) // domingo
      return d >= start && d <= end
    }
    if (dateFilter === 'month') return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
    if (dateFilter === 'custom') {
      if (customFrom && d < new Date(customFrom + 'T00:00:00')) return false
      if (customTo && d > new Date(customTo + 'T00:00:00')) return false
      return true
    }
    return true
  }

  const visibleTasks = tasks.filter(matchesDate)
  const activeFilterLabel = DATE_FILTERS.find(f => f.id === dateFilter)?.label || 'Todas as datas'

  async function remove(id: number) {
    if (!confirm('Excluir tarefa?')) return
    await fetch('/api/tasks', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  const priorityColor = (p: string) => p === 'alta' ? 'text-red-400 bg-red-500/10' : p === 'media' ? 'text-yellow-400 bg-yellow-500/10' : 'text-green-400 bg-green-500/10'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">✅ Tarefas</h1>
        <div className="flex items-center gap-3">
          {/* Filtro por data estilo ClickUp */}
          <div className="relative">
            <button onClick={() => setShowDateMenu(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-colors ${dateFilter !== 'all' ? 'border-purple-500/50 text-purple-300 bg-purple-500/10' : 'border-white/10 text-zinc-300 bg-white/5 hover:bg-white/10'}`}>
              <span>📅</span>
              <span>{activeFilterLabel}</span>
              <span className="text-xs opacity-60">▾</span>
            </button>
            {showDateMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDateMenu(false)} />
                <div className="absolute right-0 mt-2 w-60 glass rounded-xl p-2 z-50 border border-white/10 shadow-xl">
                  {DATE_FILTERS.map(f => (
                    <button key={f.id}
                      onClick={() => { setDateFilter(f.id); if (f.id !== 'custom') setShowDateMenu(false) }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${dateFilter === f.id ? 'bg-purple-500/20 text-purple-200' : 'text-zinc-300 hover:bg-white/5'}`}>
                      {f.label}
                    </button>
                  ))}
                  {dateFilter === 'custom' && (
                    <div className="px-2 pt-2 mt-1 border-t border-white/10 space-y-2">
                      <label className="block text-xs text-zinc-400">De
                        <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="mt-1 w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm" />
                      </label>
                      <label className="block text-xs text-zinc-400">Até
                        <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="mt-1 w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm" />
                      </label>
                      <button onClick={() => setShowDateMenu(false)} className="w-full py-1.5 rounded-lg text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #6c3de8, #ec4899)' }}>Aplicar</button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          {dateFilter !== 'all' && (
            <button onClick={() => { setDateFilter('all'); setCustomFrom(''); setCustomTo('') }} className="text-xs text-zinc-500 hover:text-white">Limpar</button>
          )}
          <button onClick={() => { setShowForm(true); setEditId(null); setForm({ ...emptyForm }) }}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #6c3de8, #ec4899)' }}>
            + Nova Tarefa
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="glass rounded-2xl p-6 w-full max-w-lg">
            <h2 className="font-bold text-white mb-4">{editId ? 'Editar' : 'Nova'} Tarefa</h2>
            <div className="space-y-3">
              <input placeholder="Título *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
              <textarea placeholder="Descrição" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" rows={2} />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm">
                  {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm">
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
              <select value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm">
                <option value="">Sem responsável</option>
                {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm">
                <option value="">Sem cliente</option>
                {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={save} className="flex-1 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #6c3de8, #ec4899)' }}>Salvar</button>
              <button onClick={() => { setShowForm(false); setEditId(null) }} className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-white bg-white/5">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map(col => {
          const colTasks = visibleTasks.filter(t => t.status === col.id)
          return (
            <div key={col.id}
              onDragOver={e => { e.preventDefault(); setDragOverCol(col.id) }}
              onDragLeave={() => setDragOverCol(c => c === col.id ? null : c)}
              onDrop={() => onDrop(col.id)}
              className={`glass rounded-2xl p-4 transition-colors ${dragOverCol === col.id ? 'ring-2 ring-purple-500/60 bg-purple-500/5' : ''}`}>
              <h2 className={`font-bold text-sm mb-4 ${col.color}`}>{col.label} ({colTasks.length})</h2>
              <div className="space-y-3 min-h-[80px]">
                {colTasks.map(task => (
                  <div key={task.id}
                    draggable
                    onDragStart={() => setDraggedId(task.id)}
                    onDragEnd={() => { setDraggedId(null); setDragOverCol(null) }}
                    className={`bg-white/5 rounded-xl p-3 border border-white/5 cursor-grab active:cursor-grabbing hover:border-white/15 transition-all ${draggedId === task.id ? 'opacity-40' : ''}`}>
                    <p className="text-white text-sm font-medium mb-1">{task.title}</p>
                    {task.client_name && <p className="text-xs text-zinc-500 mb-1">👥 {task.client_name}</p>}
                    {task.assigned_name && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <Avatar name={task.assigned_name} url={task.assigned_avatar} />
                        <span className="text-xs text-zinc-400">{task.assigned_name}</span>
                      </div>
                    )}
                    {task.due_date && <p className="text-xs text-zinc-500 mb-2">📅 {new Date(task.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>}
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${priorityColor(task.priority)}`}>{task.priority}</span>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditId(task.id); setForm({ title: task.title, description: task.description || '', status: task.status, priority: task.priority, assigned_to: task.assigned_to || '', client_id: task.client_id || '', due_date: task.due_date || '' }); setShowForm(true) }} className="text-xs text-zinc-500 hover:text-white">✏️</button>
                        <button onClick={() => remove(task.id)} className="text-xs text-zinc-500 hover:text-red-400">🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
                {colTasks.length === 0 && <p className="text-zinc-600 text-xs text-center py-4">{dragOverCol === col.id ? 'Solte aqui' : 'Vazio'}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
