'use client'
import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function JoaoPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    const assistantMsg: Message = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMsg])

    try {
      const res = await fetch('/api/joao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!res.body) throw new Error('Sem resposta')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: updated[updated.length - 1].content + chunk,
          }
          return updated
        })
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Desculpe, tive um problema técnico. Tenta de novo?',
        }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #6c3de8, #ec4899)' }}>
          🧑‍💼
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">João</h1>
          <p className="text-sm text-zinc-400">Analista de marketing • Invollve</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs text-zinc-400">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg, #6c3de81a, #ec48991a)', border: '1px solid #6c3de830' }}>
              🧑‍💼
            </div>
            <p className="text-zinc-300 font-medium mb-2">Olá! Sou o João.</p>
            <p className="text-zinc-500 text-sm max-w-xs mx-auto">
              Pode me delegar análises, campanhas, dados de performance ou qualquer demanda de marketing.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {[
                'Analisa o ROAS do mês',
                'Quais origens estão convertendo mais?',
                'Sugira melhorias para as campanhas',
                'Crie uma estratégia de conteúdo',
              ].map(s => (
                <button key={s} onClick={() => setInput(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-zinc-400 hover:text-white hover:border-purple-500/50 hover:bg-purple-500/10 transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-base mt-0.5"
                style={{ background: 'linear-gradient(135deg, #6c3de8, #ec4899)' }}>
                🧑‍💼
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-purple-600/20 text-white border border-purple-500/20 rounded-br-md'
                : 'bg-white/5 text-zinc-200 border border-white/8 rounded-bl-md'
            }`}>
              {msg.content}
              {msg.role === 'assistant' && loading && i === messages.length - 1 && msg.content === '' && (
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </span>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-sm bg-white/10 text-white mt-0.5">
                👤
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4 flex gap-3 items-end">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => { setInput(e.target.value); autoResize() }}
            onKeyDown={handleKeyDown}
            placeholder="Delegue uma análise ou tarefa ao João..."
            rows={1}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-purple-500/50 focus:bg-white/8 transition-all"
            style={{ minHeight: '48px', maxHeight: '160px' }}
          />
        </div>
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #6c3de8, #ec4899)' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
      <p className="text-center text-xs text-zinc-600 mt-2">Enter para enviar • Shift+Enter para nova linha</p>
    </div>
  )
}
