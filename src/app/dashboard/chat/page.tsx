'use client'
import { useEffect, useRef, useState } from 'react'

export default function ChatPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [me, setMe] = useState<any>(null)
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  async function load() {
    const [msgs, user] = await Promise.all([
      fetch('/api/chat').then(r => r.json()),
      fetch('/api/auth/me').then(r => r.json()),
    ])
    setMessages(Array.isArray(msgs) ? msgs : [])
    setMe(user)
  }

  useEffect(() => { load() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Poll every 5 seconds for new messages
  useEffect(() => {
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [])

  async function send() {
    if (!text.trim()) return
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    })
    setText('')
    load()
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function timeStr(ts: string) {
    const d = new Date(ts)
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  function dateStr(ts: string) {
    return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }

  // Group messages by date
  const grouped: Record<string, any[]> = {}
  messages.forEach(m => {
    const d = new Date(m.created_at).toDateString()
    if (!grouped[d]) grouped[d] = []
    grouped[d].push(m)
  })

  function initials(name: string) {
    return name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || '?'
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black text-white">💬 Chat da Equipe</h1>
        <span className="text-xs text-zinc-500">Atualiza automaticamente</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
        {Object.entries(grouped).map(([date, msgs]) => (
          <div key={date}>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-xs text-zinc-600">{dateStr(msgs[0].created_at)}</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
            {msgs.map((msg, i) => {
              const isMe = me && msg.user_id === me.id
              const showAvatar = i === 0 || msgs[i - 1].user_id !== msg.user_id
              return (
                <div key={msg.id} className={`flex items-end gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}
                    style={{ background: isMe ? 'linear-gradient(135deg, #6c3de8, #ec4899)' : 'rgba(255,255,255,0.1)' }}>
                    {msg.avatar_url ? <img src={msg.avatar_url} className="w-7 h-7 rounded-full object-cover" /> : initials(msg.user_name)}
                  </div>
                  <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                    {showAvatar && !isMe && <span className="text-xs text-zinc-500 mb-1 ml-1">{msg.user_name}</span>}
                    <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe
                      ? 'text-white rounded-br-sm'
                      : 'bg-white/8 text-white rounded-bl-sm'}`}
                      style={isMe ? { background: 'linear-gradient(135deg, #6c3de8, #a855f7)' } : {}}>
                      {msg.content}
                    </div>
                    <span className="text-xs text-zinc-600 mt-0.5 mx-1">{timeStr(msg.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-zinc-600 text-sm">Nenhuma mensagem ainda. Seja o primeiro! 👋</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="glass rounded-2xl p-3 flex gap-3 items-end">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Digite uma mensagem... (Enter para enviar)"
          rows={1}
          className="flex-1 bg-transparent text-white text-sm resize-none focus:outline-none placeholder-zinc-500"
          style={{ minHeight: '24px', maxHeight: '120px' }}
        />
        <button onClick={send} disabled={!text.trim()}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition"
          style={{ background: 'linear-gradient(135deg, #6c3de8, #ec4899)' }}>
          Enviar
        </button>
      </div>
    </div>
  )
}
