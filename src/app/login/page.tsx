'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error || 'Erro ao fazer login')
      return
    }
    if (data.role === 'cliente') router.push('/portal')
    else router.push('/dashboard/escritorio')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f13]">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <img src="/logo.png" alt="Invollve" className="h-12 mx-auto mb-4" />
          <p className="text-zinc-400 mt-1 text-sm">Gestão de Agência</p>
        </div>

        <div className="glass rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white transition disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #6c3de8, #ec4899)' }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
