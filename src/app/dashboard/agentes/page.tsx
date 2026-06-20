'use client'
import { useState, useEffect } from 'react'

type Step = 'briefing' | 'revisao' | 'aprovacao' | 'criando' | 'concluido' | 'erro'

type Criativo = { formato: string; titulo: string; texto: string; cta: string }
type Estrutura = {
  nome_campanha: string
  objetivo: string
  publico_sugerido: { faixa_etaria: string; genero: string; interesses: string[]; localizacao: string }
  orcamento_diario_sugerido: number
  duracao_dias: number
  criativos_sugeridos: Criativo[]
  estrategia_lance: string
  posicionamentos: string[]
  observacoes: string
}

const OBJETIVO_LABEL: Record<string, string> = {
  OUTCOME_LEADS: '🎯 Geração de Leads',
  OUTCOME_SALES: '🛒 Vendas',
  OUTCOME_AWARENESS: '📢 Reconhecimento de Marca',
  OUTCOME_TRAFFIC: '🔗 Tráfego para Site',
}

export default function AgentesPage() {
  const [clients, setClients] = useState<any[]>([])
  const [selectedClient, setSelectedClient] = useState('')
  const [briefing, setBriefing] = useState('')
  const [step, setStep] = useState<Step>('briefing')
  const [estrutura, setEstrutura] = useState<Estrutura | null>(null)
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<any>(null)
  const [erro, setErro] = useState('')
  const [log, setLog] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(d => {
      const withAcc = Array.isArray(d) ? d.filter((c: any) => c.meta_account_id) : []
      setClients(withAcc)
      if (withAcc.length > 0) setSelectedClient(withAcc[0].id)
    })
  }, [])

  function addLog(msg: string) {
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`])
  }

  async function gerarEstrutura() {
    if (!briefing.trim()) return
    setLoading(true)
    setStep('revisao')
    addLog('🤖 Analisando briefing com IA...')

    const res = await fetch('/api/agentes/campanha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'gerar_estrutura', briefing }),
    })
    const data = await res.json()
    setLoading(false)

    if (data.needs_key) {
      setErro('ANTHROPIC_API_KEY não configurada no .env.local')
      setStep('erro')
      return
    }
    if (data.error) {
      setErro(data.error)
      setStep('erro')
      return
    }

    addLog('✅ Estrutura gerada! Aguardando sua aprovação...')
    setEstrutura(data.estrutura)
    setStep('revisao')
  }

  async function aprovarECriar() {
    if (!estrutura) return
    const client = clients.find(c => String(c.id) === String(selectedClient))
    if (!client?.meta_account_id) {
      setErro('Cliente sem conta Meta configurada')
      setStep('erro')
      return
    }

    setStep('criando')
    setLoading(true)
    addLog('🚀 Criando campanha no Meta Ads...')

    const res = await fetch('/api/agentes/campanha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'criar_campanha', account_id: client.meta_account_id, estrutura }),
    })
    const data = await res.json()
    setLoading(false)

    if (data.needs_token) {
      setErro('META_ACCESS_TOKEN não configurado no .env.local')
      setStep('erro')
      return
    }
    if (data.error) {
      setErro(data.error)
      setStep('erro')
      return
    }

    addLog(`✅ Campanha criada! ID: ${data.campaign_id} — status: PAUSADA`)
    addLog('🔍 Acesse o Gerenciador de Anúncios para revisar e ativar.')
    setResultado(data)
    setStep('concluido')
  }

  function reiniciar() {
    setStep('briefing')
    setBriefing('')
    setEstrutura(null)
    setResultado(null)
    setErro('')
    setLog([])
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white mb-1">🤖 Agentes de IA</h1>
        <p className="text-zinc-400 text-sm">Automatize tarefas de tráfego pago. Passe o briefing, a IA monta a estrutura e cria a campanha no Meta.</p>
      </div>

      {/* Agente: Criador de Campanhas */}
      <div className="glass rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: 'linear-gradient(135deg, #6c3de8, #ec4899)' }}>🚀</div>
          <div>
            <h2 className="font-bold text-white">Criador de Campanhas Meta Ads</h2>
            <p className="text-xs text-zinc-400">Interpreta o briefing, gera a estrutura e cria a campanha para aprovação</p>
          </div>
          <div className="ml-auto">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${step === 'concluido' ? 'bg-green-500/20 text-green-400' : step === 'erro' ? 'bg-red-500/20 text-red-400' : step === 'briefing' ? 'bg-zinc-500/20 text-zinc-400' : 'bg-blue-500/20 text-blue-400'}`}>
              {step === 'briefing' ? 'Aguardando briefing' : step === 'revisao' ? 'Revisão' : step === 'criando' ? 'Criando...' : step === 'concluido' ? 'Concluído ✓' : step === 'erro' ? 'Erro' : step}
            </span>
          </div>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-6">
          {['briefing', 'revisao', 'aprovacao', 'concluido'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === s || (step === 'criando' && s === 'aprovacao') ? 'text-white' : step === 'concluido' && i < 3 ? 'bg-green-500/30 text-green-400' : 'bg-white/5 text-zinc-500'}`}
                style={step === s ? { background: 'linear-gradient(135deg, #6c3de8, #ec4899)' } : {}}>
                {i + 1}
              </div>
              <span className={`text-xs ${step === s ? 'text-white' : 'text-zinc-500'}`}>
                {s === 'briefing' ? 'Briefing' : s === 'revisao' ? 'Revisão IA' : s === 'aprovacao' ? 'Aprovação' : 'Concluído'}
              </span>
              {i < 3 && <div className="w-8 h-px bg-white/10" />}
            </div>
          ))}
        </div>

        {/* STEP 1: Briefing */}
        {step === 'briefing' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Cliente / Conta Meta</label>
              {clients.length === 0 ? (
                <p className="text-zinc-500 text-sm">Nenhum cliente com conta Meta configurada.</p>
              ) : (
                <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm">
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.meta_account_id})</option>)}
                </select>
              )}
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Briefing da Campanha</label>
              <textarea
                value={briefing}
                onChange={e => setBriefing(e.target.value)}
                rows={6}
                placeholder="Descreva a campanha: produto/serviço, objetivo, público-alvo, orçamento, período, diferenciais, etc.

Exemplo: Campanha para captar leads de interessados em consultoria de tráfego pago para pequenas empresas. Público: donos de negócio, 25-50 anos, São Paulo. Orçamento: R$100/dia. Quero leads qualificados via formulário instantâneo no Facebook."
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 resize-none"
              />
            </div>
            <button
              onClick={gerarEstrutura}
              disabled={!briefing.trim() || clients.length === 0}
              className="px-6 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #6c3de8, #ec4899)' }}>
              🤖 Analisar Briefing com IA →
            </button>
          </div>
        )}

        {/* STEP 2: Revisão da estrutura gerada */}
        {step === 'revisao' && (
          <div>
            {loading ? (
              <div className="flex items-center gap-3 text-zinc-400 py-8">
                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                Analisando briefing e montando estrutura...
              </div>
            ) : estrutura ? (
              <div className="space-y-4">
                <div className="bg-white/5 rounded-xl p-4 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-purple-400 font-bold text-sm">🤖 Estrutura gerada pela IA — revise antes de aprovar</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-zinc-500">Nome da campanha</p>
                      <input value={estrutura.nome_campanha} onChange={e => setEstrutura(s => s ? { ...s, nome_campanha: e.target.value } : s)}
                        className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm" />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Objetivo</p>
                      <select value={estrutura.objetivo} onChange={e => setEstrutura(s => s ? { ...s, objetivo: e.target.value } : s)}
                        className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm">
                        {Object.entries(OBJETIVO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Orçamento diário</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-zinc-400 text-sm">R$</span>
                        <input type="number" value={estrutura.orcamento_diario_sugerido}
                          onChange={e => setEstrutura(s => s ? { ...s, orcamento_diario_sugerido: Number(e.target.value) } : s)}
                          className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Duração (dias)</p>
                      <input type="number" value={estrutura.duracao_dias}
                        onChange={e => setEstrutura(s => s ? { ...s, duracao_dias: Number(e.target.value) } : s)}
                        className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm" />
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs text-zinc-500 mb-2">Público sugerido</p>
                    <div className="bg-black/20 rounded-lg p-3 text-sm text-zinc-300 space-y-1">
                      <p>📍 {estrutura.publico_sugerido?.localizacao}</p>
                      <p>👤 {estrutura.publico_sugerido?.faixa_etaria} — {estrutura.publico_sugerido?.genero === 'ALL' ? 'Todos' : estrutura.publico_sugerido?.genero}</p>
                      <p>🎯 {estrutura.publico_sugerido?.interesses?.join(', ')}</p>
                    </div>
                  </div>

                  {estrutura.criativos_sugeridos?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-zinc-500 mb-2">Criativos sugeridos</p>
                      <div className="space-y-2">
                        {estrutura.criativos_sugeridos.map((c, i) => (
                          <div key={i} className="bg-black/20 rounded-lg p-3 text-sm">
                            <span className="text-purple-400 text-xs font-medium">{c.formato} · {c.cta}</span>
                            <p className="text-white font-medium mt-1">{c.titulo}</p>
                            <p className="text-zinc-400 text-xs mt-1">{c.texto}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {estrutura.observacoes && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                      <p className="text-yellow-400 text-xs">💡 {estrutura.observacoes}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button onClick={aprovarECriar}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, #6c3de8, #ec4899)' }}>
                    ✅ Aprovar e Criar Campanha no Meta
                  </button>
                  <button onClick={reiniciar} className="px-4 py-3 rounded-xl text-sm text-zinc-400 hover:text-white bg-white/5">
                    Refazer
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* STEP 3: Criando */}
        {step === 'criando' && (
          <div className="flex items-center gap-3 text-zinc-400 py-8">
            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            Criando campanha no Meta Ads...
          </div>
        )}

        {/* STEP 4: Concluído */}
        {step === 'concluido' && resultado && (
          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5">
              <p className="text-green-400 font-bold mb-2">✅ Campanha criada com sucesso!</p>
              <p className="text-zinc-300 text-sm">{resultado.message}</p>
              <p className="text-zinc-500 text-xs mt-2">ID: {resultado.campaign_id}</p>
            </div>
            <button onClick={reiniciar} className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #6c3de8, #ec4899)' }}>
              + Nova Campanha
            </button>
          </div>
        )}

        {/* Erro */}
        {step === 'erro' && (
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5">
              <p className="text-red-400 font-bold mb-2">❌ Erro</p>
              <p className="text-zinc-300 text-sm">{erro}</p>
              {erro.includes('ANTHROPIC_API_KEY') && (
                <code className="block mt-2 bg-black/40 rounded px-3 py-2 text-green-400 text-xs">ANTHROPIC_API_KEY=sk-ant-...</code>
              )}
              {erro.includes('META_ACCESS_TOKEN') && (
                <code className="block mt-2 bg-black/40 rounded px-3 py-2 text-green-400 text-xs">META_ACCESS_TOKEN=seu_token_aqui</code>
              )}
            </div>
            <button onClick={reiniciar} className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-white bg-white/5">← Voltar</button>
          </div>
        )}

        {/* Log */}
        {log.length > 0 && (
          <div className="mt-4 bg-black/40 rounded-xl p-3">
            {log.map((l, i) => <p key={i} className="text-xs text-zinc-400 font-mono">{l}</p>)}
          </div>
        )}
      </div>

      {/* Próximos agentes (roadmap) */}
      <div className="glass rounded-2xl p-5">
        <h3 className="font-bold text-white mb-4 text-sm">🗺️ Próximos Agentes</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { icon: '📊', name: 'Otimizador de Campanhas', desc: 'Analisa performance e sugere pausas/ajustes automáticos', status: 'Em breve' },
            { icon: '📝', name: 'Gerador de Relatórios', desc: 'Cria relatório mensal PDF para o cliente automaticamente', status: 'Em breve' },
            { icon: '🎨', name: 'Gerador de Copy', desc: 'Escreve textos e headlines para anúncios com IA', status: 'Em breve' },
            { icon: '🎯', name: 'Criador de Públicos', desc: 'Sugere e cria públicos personalizados e lookalike', status: 'Em breve' },
            { icon: '📱', name: 'Monitor de Leads', desc: 'Alerta quando CPL sai do target definido', status: 'Em breve' },
            { icon: '🔄', name: 'Duplicador de Campanhas', desc: 'Duplica campanhas vencedoras para outros clientes', status: 'Em breve' },
          ].map(a => (
            <div key={a.name} className="bg-white/3 rounded-xl p-4 border border-white/5">
              <div className="text-2xl mb-2">{a.icon}</div>
              <p className="text-white text-sm font-medium">{a.name}</p>
              <p className="text-zinc-500 text-xs mt-1">{a.desc}</p>
              <span className="mt-2 inline-block px-2 py-0.5 rounded-full text-xs bg-zinc-500/20 text-zinc-400">{a.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
