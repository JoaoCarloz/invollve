'use client'
import { useEffect, useState, useCallback } from 'react'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtNum(v: number) {
  return v.toLocaleString('pt-BR')
}
function fmtPct(v: number) {
  return (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'
}
function fmtX(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'x'
}

function KpiCard({ label, value, sub, color = 'text-white', loading }: any) {
  return (
    <div className="glass rounded-2xl p-4 flex flex-col gap-1">
      <p className="text-xs text-zinc-400">{label}</p>
      {loading
        ? <div className="h-7 w-24 bg-white/10 animate-pulse rounded-lg" />
        : <p className={`text-xl font-black ${color}`}>{value}</p>}
      {sub && <p className="text-xs text-zinc-500">{sub}</p>}
    </div>
  )
}

function BigCard({ label, value, loading }: any) {
  return (
    <div className="glass rounded-2xl p-6 flex flex-col gap-1">
      <p className="text-sm text-zinc-400">{label}</p>
      {loading
        ? <div className="h-10 w-40 bg-white/10 animate-pulse rounded-xl" />
        : <p className="text-4xl font-black text-white">{value}</p>}
    </div>
  )
}

function RoasCard({ label, value, loading }: any) {
  return (
    <div className="glass rounded-2xl p-4 text-center">
      <p className="text-xs text-zinc-400 mb-1">{label}</p>
      {loading
        ? <div className="h-8 w-16 bg-white/10 animate-pulse rounded-lg mx-auto" />
        : <p className="text-3xl font-black text-white">{value}</p>}
    </div>
  )
}

function FunnelBar({ label, value, sub, color, pct = 100 }: any) {
  return (
    <div className="relative mb-2" style={{ width: `${Math.max(pct, 40)}%`, minWidth: 180 }}>
      <div className={`rounded-xl p-3 text-center ${color}`}>
        <p className="text-xs text-white/70">{label}</p>
        <p className="text-white font-bold text-lg">{value}</p>
        {sub && <p className="text-xs text-white/60">{sub}</p>}
      </div>
    </div>
  )
}

export default function PerformanceRealPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [monthIdx, setMonthIdx] = useState(now.getMonth()) // 0-based
  const [data, setData] = useState<any>(null)
  const [igData, setIgData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const month = `${year}-${String(monthIdx + 1).padStart(2, '0')}`
    const [res, igRes] = await Promise.all([
      fetch(`/api/performance/real?month=${month}`),
      fetch(`/api/performance/instagram?month=${month}`),
    ])
    const [json, igJson] = await Promise.all([res.json(), igRes.json()])
    setData(json)
    if (!igJson.needs_token && !igJson.error) setIgData(igJson)
    setLoading(false)
    setLastUpdate(new Date().toLocaleString('pt-BR'))
  }, [year, monthIdx])

  useEffect(() => { load() }, [load])

  const years = [2024, 2025, 2026]

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center">
            <span className="text-2xl">🏭</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Real Equipamentos</h1>
            <p className="text-xs text-zinc-400">Dashboard de Performance</p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <select value={monthIdx} onChange={e => setMonthIdx(Number(e.target.value))}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm">
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={load}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #6c3de8, #ec4899)' }}>
            {loading ? '⟳' : '↺'} Atualizar
          </button>
        </div>
        {lastUpdate && <p className="text-xs text-zinc-500 w-full">Última atualização: {lastUpdate}</p>}
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <KpiCard label="Geral — Setor Contact" value={fmtBRL(data?.geralSetorContact || 0)}
          color="text-green-400" loading={loading} />
        <KpiCard label="Influenciado pela Invollve" value={fmtBRL(data?.influenciadoInvollve || 0)}
          color="text-purple-400" loading={loading} />
        <KpiCard label="Investimento Meta Total" value={fmtBRL(data?.investimentoMeta || 0)}
          sub={data ? `Contact: ${fmtBRL(data.investimentoMetaContact || 0)} | Lojas: ${fmtBRL(data.investimentoMetaLojas || 0)}` : undefined}
          color="text-blue-400" loading={loading} />
        <KpiCard label="Investimento Google Ads" value="—"
          sub="Em breve" color="text-zinc-500" loading={false} />
        <KpiCard label="Leads Gerados" value={fmtNum(data?.leadsGerados || 0)}
          color="text-yellow-400" loading={loading} />
        <KpiCard label="Custo por Lead" value={data?.custoporLead ? fmtBRL(data.custoporLead) : '—'}
          color="text-orange-400" loading={loading} />
      </div>

      {/* Middle — Results + ROAS + Funnels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Left — Results */}
        <div className="space-y-3">
          <BigCard label="Resultado Geral" value={fmtBRL(data?.resultadoGeral || 0)} loading={loading} />
          <BigCard label="Influenciado no Contact Center" value={fmtBRL(data?.influenciadoContactCenter || 0)} loading={loading} />
          <BigCard label="Influenciado nas Lojas" value={fmtBRL(data?.influenciadoLojas || 0)} loading={loading} />

          {/* ROAS */}
          <div className="grid grid-cols-3 gap-3">
            <RoasCard label="ROAS Geral" value={fmtX(data?.roasGeral || 0)} loading={loading} />
            <RoasCard label="ROAS Contact" value={fmtX(data?.roasContact || 0)} loading={loading} />
            <RoasCard label="ROAS Lojas" value={fmtX(data?.roasLojas || 0)} loading={loading} />
          </div>

          {/* Lojas breakdown */}
          {data?.lojasByStore && (
            <div className="glass rounded-2xl p-4">
              <p className="text-xs text-zinc-400 mb-3 font-semibold">Faturamento por Loja</p>
              <div className="space-y-2">
                {Object.entries(data.lojasByStore).map(([loja, val]: any) => (
                  <div key={loja} className="flex items-center justify-between">
                    <span className="text-sm text-zinc-300">🏪 {loja}</span>
                    <span className="text-sm font-bold text-white">{fmtBRL(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — Funnels */}
        <div className="space-y-4">
          {/* WhatsApp Funnel */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-yellow-400 text-sm">💬 Desempenho WhatsApp</h3>
              <div className="text-right">
                <p className="text-xs text-zinc-400">Valor</p>
                <p className="font-bold text-white text-sm">{loading ? '...' : fmtBRL(data?.whatsapp?.valor || 0)}</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <FunnelBar label="Tkt médio" value={loading ? '...' : fmtBRL(data?.whatsapp?.ticketMedio || 0)}
                color="bg-blue-600/60" pct={100} />
              <FunnelBar label="Alcance" value={loading ? '...' : fmtNum(data?.whatsapp?.alcance || 0)}
                color="bg-blue-500/60" pct={88} />
              <FunnelBar label="Leads Gerados" value={loading ? '...' : fmtNum(data?.whatsapp?.leadsGerados || 0)}
                color="bg-blue-400/60" pct={75} />
              <FunnelBar label="Vendas" value={loading ? '...' : fmtNum(data?.whatsapp?.vendas || 0)}
                color="bg-blue-300/60" pct={62} />
            </div>
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
              <p className="text-xs text-zinc-400">% Conversão Comercial</p>
              <p className="font-bold text-yellow-400">{loading ? '...' : fmtPct(data?.whatsapp?.taxaConversao || 0)}</p>
            </div>
          </div>

          {/* Site Funnel */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-blue-400 text-sm">🌐 Performance Geral do Site</h3>
              <div className="text-right">
                <p className="text-xs text-zinc-400">Valor</p>
                <p className="font-bold text-white text-sm">{loading ? '...' : fmtBRL(data?.site?.valor || 0)}</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <FunnelBar label="Tkt médio" value={loading ? '...' : fmtBRL(data?.site?.ticketMedio || 0)}
                color="bg-indigo-600/60" pct={100} />
              <FunnelBar label="Visitas" value="—" sub="Conectar Google Analytics"
                color="bg-indigo-500/50" pct={88} />
              <FunnelBar label="Adicionar ao carrinho" value="—"
                color="bg-indigo-400/50" pct={75} />
              <FunnelBar label="Ir para Checkout" value="—"
                color="bg-indigo-300/50" pct={62} />
              <FunnelBar label="Vendas" value={loading ? '...' : fmtNum(data?.site?.vendas || 0)}
                color="bg-indigo-200/50" pct={50} />
            </div>
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
              <p className="text-xs text-zinc-400">% Conversão Site</p>
              <p className="font-bold text-blue-400">— (aguarda Analytics)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Extra metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KpiCard label="Impressões Meta" value={fmtNum(data?.impressoes || 0)} loading={loading} />
        <KpiCard label="Alcance Meta" value={fmtNum(data?.whatsapp?.alcance || 0)} loading={loading} />
        <KpiCard label="Cliques" value={fmtNum(data?.cliques || 0)} loading={loading} />
        <KpiCard label="CPM" value={data?.cpm ? fmtBRL(data.cpm) : '—'} loading={loading} />
      </div>

      {/* Consultores */}
      {data?.consultorMap && Object.keys(data.consultorMap).length > 0 && (
        <div className="glass rounded-2xl p-5">
          <p className="text-sm font-bold text-white mb-3">👤 Faturamento por Consultor (Contact Center)</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(data.consultorMap)
              .sort(([, a]: any, [, b]: any) => b - a)
              .map(([nome, val]: any) => (
                <div key={nome} className="bg-white/5 rounded-xl p-3">
                  <p className="text-xs text-zinc-400">{nome}</p>
                  <p className="font-bold text-white">{fmtBRL(val)}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Instagram Section */}
      <div className="mt-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">📸</span>
          <h2 className="text-lg font-bold text-white">Instagram @realequipamentos</h2>
        </div>

        {igData ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
              <KpiCard label="Visualizações" value={fmtNum(igData.views)} color="text-pink-400" loading={loading} />
              <KpiCard label="Alcance" value={fmtNum(igData.reach)} color="text-purple-400" loading={loading} />
              <KpiCard label="Interações" value={fmtNum(igData.totalInteractions)} color="text-blue-400" loading={loading} />
              <KpiCard label="Cliques no Link" value={fmtNum(igData.websiteClicks)} color="text-green-400" loading={loading} />
              <KpiCard label="Seguidores" value={fmtNum(igData.followers)} color="text-yellow-400" loading={loading} />
            </div>

            {/* Insights & Ações */}
            <div className="glass rounded-2xl p-5">
              <h3 className="font-bold text-white mb-4 text-sm">💡 Análise & Plano de Ação</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-pink-400 mb-2">DIAGNÓSTICO</p>
                  <ul className="space-y-2 text-sm text-zinc-300">
                    {igData.reach > 0 && igData.views > 0 && (
                      <li>• Frequência média: <span className="text-white font-bold">{(igData.views / igData.reach).toFixed(1)}x</span> por pessoa alcançada
                        {igData.views / igData.reach < 1.5
                          ? ' — alcance amplo, baixa recorrência'
                          : ' — boa recorrência de visualização'}
                      </li>
                    )}
                    {igData.profileViews > 0 && igData.reach > 0 && (
                      <li>• Taxa de visita ao perfil: <span className="text-white font-bold">{((igData.profileViews / igData.reach) * 100).toFixed(1)}%</span> do alcance
                        {(igData.profileViews / igData.reach) < 0.03
                          ? ' — conteúdo não está gerando curiosidade suficiente'
                          : ' — bom engajamento com o perfil'}
                      </li>
                    )}
                    {igData.websiteClicks > 0 && igData.profileViews > 0 && (
                      <li>• Conversão perfil → link: <span className="text-white font-bold">{((igData.websiteClicks / igData.profileViews) * 100).toFixed(1)}%</span>
                        {(igData.websiteClicks / igData.profileViews) < 0.1
                          ? ' — bio/link não está convertendo bem'
                          : ' — boa conversão para o site'}
                      </li>
                    )}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-green-400 mb-2">AÇÕES RECOMENDADAS</p>
                  <ul className="space-y-2 text-sm text-zinc-300">
                    {igData.websiteClicks < 100 && (
                      <li>• Adicionar CTA claro nos Reels e Stories para clicar no link da bio</li>
                    )}
                    {igData.reach > 0 && igData.followers > 0 && igData.reach / igData.followers < 3 && (
                      <li>• Aumentar frequência de publicações — alcance baixo em relação à base de seguidores</li>
                    )}
                    {igData.profileViews > igData.websiteClicks * 5 && (
                      <li>• Otimizar bio com oferta clara e link direto para produto/WhatsApp</li>
                    )}
                    <li>• Conectar Google Analytics para rastrear visitantes vindos do Instagram até a venda</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="glass rounded-2xl p-6 text-center">
            <p className="text-zinc-400 text-sm">Configure META_ACCESS_TOKEN no Vercel para exibir dados do Instagram.</p>
          </div>
        )}
      </div>
    </div>
  )
}
