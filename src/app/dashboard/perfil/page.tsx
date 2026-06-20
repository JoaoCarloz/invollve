'use client'
import { useEffect, useRef, useState } from 'react'

const ROLES: Record<string, string> = {
  socio: 'Sócio', gestor_trafego: 'Gestor de Tráfego', social_media: 'Social Media',
  designer: 'Designer / Editor', cliente: 'Cliente', staff: 'Equipe',
}

export default function PerfilPage() {
  const [profile, setProfile] = useState<any>(null)
  const [form, setForm] = useState({ name: '', phone: '', birthday: '', avatar_url: '' })
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [saved, setSaved] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    const data = await fetch('/api/profile').then(r => r.json())
    setProfile(data)
    setForm({ name: data.name || '', phone: data.phone || '', birthday: data.birthday || '', avatar_url: data.avatar_url || '' })
  }
  useEffect(() => { load() }, [])

  async function saveProfile() {
    await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    load()
  }

  async function changePassword() {
    setPwError('')
    if (pwForm.new_password !== pwForm.confirm) { setPwError('As senhas não coincidem'); return }
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, ...pwForm }),
    })
    if (!res.ok) {
      const err = await res.json()
      setPwError(err.error)
      return
    }
    setPwSaved(true)
    setPwForm({ current_password: '', new_password: '', confirm: '' })
    setTimeout(() => setPwSaved(false), 3000)
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload/avatar', { method: 'POST', body: fd })
    const data = await res.json()
    setUploading(false)
    if (data.url) setForm(f => ({ ...f, avatar_url: data.url }))
  }

  function initials(name: string) {
    return name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || '?'
  }

  if (!profile) return <div className="text-zinc-400">Carregando...</div>

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-black text-white mb-6">👤 Meu Perfil</h1>

      <div className="glass rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-4 mb-6">
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-black overflow-hidden relative group cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #6c3de8, #ec4899)' }}
            title="Clique para trocar a foto">
            {form.avatar_url ? <img src={form.avatar_url} className="w-full h-full object-cover" alt="" /> : initials(form.name)}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs">
              {uploading ? '...' : '📷'}
            </div>
          </button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={uploadAvatar} />
          <div>
            <p className="font-bold text-white">{profile.name}</p>
            <p className="text-sm text-zinc-400">{profile.email}</p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">{ROLES[profile.role] || profile.role}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Nome</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Telefone</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" placeholder="(11) 99999-9999" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Data de Aniversário <span className="text-purple-400">(sincroniza com RH automaticamente)</span></label>
            <input type="date" value={form.birthday} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Foto de Perfil</label>
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 text-sm text-left hover:bg-white/10 transition">
              {uploading ? 'Enviando...' : form.avatar_url ? '✅ Foto carregada — clique para trocar' : '📷 Clique para fazer upload (JPEG ou PNG)'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button onClick={saveProfile} className="px-6 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #6c3de8, #ec4899)' }}>
            Salvar Perfil
          </button>
          {saved && <span className="text-green-400 text-sm">✅ Salvo!</span>}
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="font-bold text-white mb-4">🔒 Alterar Senha</h2>
        <div className="space-y-3">
          <input type="password" placeholder="Senha atual" value={pwForm.current_password} onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
          <input type="password" placeholder="Nova senha" value={pwForm.new_password} onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
          <input type="password" placeholder="Confirmar nova senha" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" />
        </div>
        {pwError && <p className="text-red-400 text-xs mt-2">{pwError}</p>}
        <div className="flex items-center gap-3 mt-4">
          <button onClick={changePassword} className="px-6 py-2 rounded-xl text-sm font-semibold text-white bg-white/10 hover:bg-white/15 transition">
            Alterar Senha
          </button>
          {pwSaved && <span className="text-green-400 text-sm">✅ Senha alterada!</span>}
        </div>
      </div>
    </div>
  )
}
