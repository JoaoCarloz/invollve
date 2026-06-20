'use client'
import { useEffect, useState } from 'react'

const emptyForm = { title: '', description: '', meet_link: '', start_time: '', end_time: '', attendees: '', client_id: '' }

function generateMeetLink() {
  const chars = 'abcdefghijklmnopqrstuvwxyz'
  const seg = () => Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `https://meet.google.com/${seg()}-${seg()}-${seg()}`
}

export default function ReunioesPage() {
  const [meetings, setMeetings] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [form, setForm] = useState({ ...emptyForm })
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)

  async function load() {
    const [m, c] = await Promise.all([
      fetch('/api/meetings').then(r => r.json()),
      fetch('/api/clients').then(r => r.json()),
    ])
    setMeetings(Array.isArray(m) ? m : [])
    setClients(Array.isArray(c) ? c : [])
  }
  useEffect(() => { load() }, [])

  async function save() {
    const method = editId ? 'PUT' : 'POST'
    const body = editId ? { ...form, id: editId } : form
    await fetch('/api/meetings', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setForm({ ...emptyForm }); setShowForm(false); setEditId(null); load()
  }

  async function remove(id: number) {
    if (!confirm('Excluir reunião?')) return
    await fetch('/api/meetings', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  const upcoming = meetings.filter(m => new Date(m.start_time) >= new Date())
  const past = meetings.filter(m => new Date(m.start_time) < new Date())

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">📅 Reuniões</h1>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ ...emptyForm, meet_link: generateMeetLink() }) }}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #6c3de8, #ec4899)' }}>
          + Agendar Reunião
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="glass rounded-2xl p-6 w-full max-w-lg">
            <h2 className="font-bold text-white mb-4">{editId ? 'Editar' : 'Agendar'} Reunião</h2>
            <div className="space-y-3">
              <input placeholder="Título *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
              <textarea placeholder="Descrição / Pauta" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" rows={2} />
              <div className="flex gap-2 items-center">
                <input placeholder="Link do Google Meet" value={form.meet_link} onChange={e => setForm(f => ({ ...f, meet_link: e.target.value }))} className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
                <button type="button" onClick={() => setForm(f => ({ ...f, meet_link: generateMeetLink() }))} className="px-3 py-2 rounded-xl bg-white/5 text-zinc-400 hover:text-white text-xs">Gerar</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Início *</label>
                  <input type="datetime-local" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Fim</label>
                  <input type="datetime-local" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
                </div>
              </div>
              <input placeholder="Participantes (nomes/emails)" value={form.attendees} onChange={e => setForm(f => ({ ...f, attendees: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
              <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm">
                <option value="">Sem cliente</option>
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

      {upcoming.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-zinc-400 mb-3">Próximas</h2>
          <div className="space-y-3">
            {upcoming.map(m => <MeetingCard key={m.id} meeting={m} onDelete={remove} onEdit={() => { setEditId(m.id); setForm({ title: m.title, description: m.description || '', meet_link: m.meet_link || '', start_time: m.start_time?.slice(0, 16) || '', end_time: m.end_time?.slice(0, 16) || '', attendees: m.attendees || '', client_id: m.client_id || '' }); setShowForm(true) }} />)}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-400 mb-3">Realizadas</h2>
          <div className="space-y-3 opacity-60">
            {past.slice(0, 5).map(m => <MeetingCard key={m.id} meeting={m} onDelete={remove} onEdit={() => {}} />)}
          </div>
        </div>
      )}

      {meetings.length === 0 && <p className="text-zinc-500 text-center py-8">Nenhuma reunião agendada</p>}
    </div>
  )
}

function MeetingCard({ meeting: m, onDelete, onEdit }: any) {
  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-4">
      <div className="text-center bg-white/5 rounded-xl p-3 min-w-[60px]">
        <p className="text-xs text-zinc-400">{new Date(m.start_time).toLocaleDateString('pt-BR', { month: 'short' })}</p>
        <p className="text-xl font-black text-white">{new Date(m.start_time).getDate()}</p>
        <p className="text-xs text-zinc-400">{new Date(m.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
      </div>
      <div className="flex-1">
        <p className="font-semibold text-white">{m.title}</p>
        {m.client_name && <p className="text-xs text-zinc-400">👥 {m.client_name}</p>}
        {m.attendees && <p className="text-xs text-zinc-400">👤 {m.attendees}</p>}
        {m.description && <p className="text-xs text-zinc-500 mt-1">{m.description}</p>}
      </div>
      <div className="flex flex-col gap-2">
        {m.meet_link && (
          <a href={m.meet_link} target="_blank" rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition">
            Entrar no Meet
          </a>
        )}
        <div className="flex gap-1">
          <button onClick={onEdit} className="text-xs text-zinc-500 hover:text-white px-2 py-1 rounded bg-white/5">✏️</button>
          <button onClick={() => onDelete(m.id)} className="text-xs text-zinc-500 hover:text-red-400 px-2 py-1 rounded bg-white/5">🗑️</button>
        </div>
      </div>
    </div>
  )
}
