'use client'
import { useState, useEffect } from 'react'
import { UserSession } from '@/lib/auth'

const COLORS = [
  { hex: '#4f8de8', name: 'Azul' },
  { hex: '#e8804f', name: 'Laranja' },
  { hex: '#5aa86b', name: 'Verde' },
  { hex: '#b06fd0', name: 'Roxo' },
  { hex: '#f0a23a', name: 'Dourado' },
  { hex: '#e85a7a', name: 'Rosa' },
  { hex: '#5ac8c8', name: 'Ciano' },
  { hex: '#a0a0b0', name: 'Cinza' },
]

const ROLE_DEFAULT: Record<string, string> = {
  socio: '#f0a23a', gestor_trafego: '#4f8de8', social_media: '#e8504f',
  designer: '#b06fd0', staff: '#a0a0b0',
}

const LS_KEY = 'invollve_avatar_color'
const SS_KEY = 'invollve_office_entered'

export function getAvatarColor(role: string): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(LS_KEY)
    if (saved) return saved
  }
  return ROLE_DEFAULT[role] ?? '#7a8290'
}

export default function AvatarSelect({ session, onEnter }: { session: UserSession; onEnter: (color: string) => void }) {
  const defaultColor = ROLE_DEFAULT[session.role] ?? '#7a8290'
  const [color, setColor] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(LS_KEY) ?? defaultColor
    return defaultColor
  })
  const [entering, setEntering] = useState(false)

  function enter() {
    localStorage.setItem(LS_KEY, color)
    sessionStorage.setItem(SS_KEY, '1')
    setEntering(true)
    setTimeout(() => onEnter(color), 600)
  }

  const initials = session.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  return (
    <div
      className={`absolute inset-0 z-50 flex items-center justify-center bg-[#08080c]/95 backdrop-blur-sm transition-opacity duration-500 ${entering ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      <div className="flex flex-col items-center gap-6 px-8 py-10 rounded-3xl border border-white/10 bg-[#0f1420]/90 shadow-2xl max-w-sm w-full mx-4">

        {/* Avatar preview */}
        <div className="relative">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg ring-4 ring-white/10 transition-colors duration-200"
            style={{ background: color }}
          >
            {initials}
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-400 border-2 border-[#0f1420]" />
        </div>

        {/* Name */}
        <div className="text-center">
          <p className="text-white text-xl font-semibold">{session.name.split(' ')[0]}</p>
          <p className="text-zinc-500 text-sm mt-0.5">Escolha sua cor</p>
        </div>

        {/* Color picker */}
        <div className="flex flex-wrap justify-center gap-3">
          {COLORS.map(c => (
            <button
              key={c.hex}
              onClick={() => setColor(c.hex)}
              title={c.name}
              className="w-9 h-9 rounded-full transition-all duration-150 hover:scale-110"
              style={{
                background: c.hex,
                outline: color === c.hex ? `3px solid white` : '3px solid transparent',
                outlineOffset: '2px',
              }}
            />
          ))}
        </div>

        {/* Enter button */}
        <button
          onClick={enter}
          className="w-full py-3 rounded-xl bg-white text-[#0f1420] font-bold text-sm hover:bg-zinc-100 active:scale-95 transition-all shadow-lg"
        >
          Entrar no escritório →
        </button>
      </div>
    </div>
  )
}

export function shouldShowAvatarSelect(): boolean {
  if (typeof window === 'undefined') return false
  return !sessionStorage.getItem(SS_KEY)
}
