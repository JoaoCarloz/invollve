'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const DATE_PRESETS = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'this_week_sun_today', label: 'Esta semana' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'last_month', label: 'Mês passado' },
  { value: 'last_7d', label: 'Últimos 7 dias' },
  { value: 'last_30d', label: 'Últimos 30 dias' },
]

function parseBRL(val: string | undefined): number {
  if (!val || val === 'Not available') return 0
  return parseFloat(val.replace(/[^0-9,]/g, '').replace(',', '.')) || 0
}

function parseNum(val: string | undefined): number {
  if (!val || val === 'Not available') return 0
  return parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0
}

function fmtBRL(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtNum(val: number) {
  return val.toLocaleString('pt-BR')
}

function fmtPct(val: string | undefined) {
  if (!val) return '0,00%'
  const n = parseFloat(val)
  return isNaN(n) ? '0,00%' : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'
}

function fmtMetric(val: string | undefined) {
  if (!val || val === 'Not available') return 'R$ 0,00'
  const n = parseFloat(val)
  return isNaN(n) ? val : fmtBRL(n)
}

function MetricCard({ label, value, sub, color = 'text-white' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-xs text-zinc-400 mb-1">{label}</p>
      <p className={`text-xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  )
}

function Funnel({ title, color, data }: { title: string; color: string; data: { label: string; value: string; sub?: string }[] }) {
  return (
    <div className="glass rounded-2xl p-5 flex-1">
      <h3 className={`font-bold text-sm mb-4 ${color}`}>{title}</h3>
      <div className="space-y-2">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex-1 bg-blue-500/10 rounded-xl p-3 border border-blue-500/10"
              style={{ width: `${100 - i * 12}%`, minWidth: '60%' }}>
              <p className="text-xs text-zinc-400">{item.label}</p>
              <p className="text-white font-bold">{item.value}</p>
              {item.sub && <p className={`text-xs ${color}`}>{item.sub}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PerformancePage() {
  const [clients, setClients] = useState<any[]>([])
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [datePreset, setDatePreset] = useState('this_month')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [noToken, setNoToken] = useState(false)

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(d => {
      const withMeta = Array.isArray(d) ? d.filter((c: any) => c.meta_account_id) : []
      setClients(withMeta)
      if (withMeta.length > 0) setSelectedClient(withMeta[0])
    })
  }, [])

  useEffect(() => {
    if (!selectedClient) return
    loadData()
  }, [selectedClient, datePreset])

  async function loadData() {
    if (!selectedClient) return
    setLoading(true)
    const params = new URLSearchParams({ date_preset: datePreset })
    if (selectedClient.meta_account_id) params.set('account_id', selectedClient.meta_account_id)
    if (selectedClient.meta_account_id2) params.set('account_id2', selectedClient.meta_account_id2)
    if (selectedClient.instagram_id) params.set('ig_id', selectedClient.instagram_id)
    const res = await fetch(`/api/meta-insights?${params}`)
    const json = await res.json()
    setLoading(false)
    if (json.needs_token) { setNoToken(true); return }
    setNoToken(false)
    setData(json)
  }

  const acc1 = data?.account1
  const acc2 = data?.account2

  // Parsed values
  const spend1 = parseBRL(acc1?.spend)
  const spend2 = parseBRL(acc2?.spend)
  const totalSpend = spend1 + spend2

  const impressions1 = parseNum(acc1?.impressions)
  const impressions2 = parseNum(acc2?.impressions)
  const reach1 = parseNum(acc1?.reach)
  const reach2 = parseNum(acc2?.reach)
  const clicks1 = parseNum(acc1?.clicks)
  const clicks2 = parseNum(acc2?.clicks)

  const getAction = (acc: any, type: string) => {
    if (!acc?.actions) return 0
    const a = acc.actions.find((a: any) => a.action_type === type)
    return parseFloat(a?.value || '0')
  }

  const leads1 = getAction(acc1, 'onsite_conversion.messaging_deep_conversation') || getAction(acc1, 'lead')
  const leads2 = getAction(acc2, 'lead') || getAction(acc2, 'purchase')
  const purchases2 = getAction(acc2, 'purchase') || getAction(acc2, 'omni_purchase')

  const totalLeads = leads1 + leads2
  const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0

  const roas1Raw = acc1?.purchase_roas?.[0]?.value
  const roas2Raw = acc2?.purchase_roas?.[0]?.value
  const roas1 = parseFloat(roas1Raw || '0')
  const roas2 = parseFloat(roas2Raw || '0')
  const roasGeral = roas1 > 0 || roas2 > 0
    ? ((roas1 * spend1 + roas2 * spend2) / (totalSpend || 1))
    : 0

  return (
    <div>
      {/* Dashboards dedicados */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white mb-4">📈 Performance</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <Link href="/dashboard/performance/real"
            className="glass rounded-2xl p-5 border border-purple-500/30 hover:border-purple-500/60 transition group cursor-pointer">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">🏭</span>
              <div>
                <p className="font-bold text-white group-hover:text-purple-300 transition">Real Equipamentos</p>
                <p className="text-xs text-zinc-400">Dashboard completo — Meta + Vendas + Lojas</p>
              </div>
            </div>
            <span className="text-xs text-purple-400 font-semibold">Abrir dashboard →</span>
          </Link>
        </div>
        <p className="text-xs text-zinc-500 mb-4">— Ou visualize dados Meta Ads por conta abaixo —</p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-zinc-300">Meta Ads — Visão Geral</h1>
          <select value={selectedClient?.id || ''} onChange={e => setSelectedClient(clients.find(c => c.id === Number(e.target.value)))}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm">
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <select value={datePreset} onChange={e => setDatePreset(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm">
            {DATE_PRESETS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <button onClick={loadData} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #6c3de8, #ec4899)' }}>
            {loading ? '⟳ Atualizando...' : '↺ Atualizar'}
          </button>
        </div>
      </div>

      {noToken && (
        <div className="glass rounded-2xl p-6 mb-6 border border-yellow-500/20">
          <h2 className="font-bold text-yellow-400 mb-2">⚠️ Token do Meta não configurado</h2>
          <p className="text-zinc-400 text-sm mb-3">Para buscar dados ao vivo do Meta Ads, adicione seu token de acesso no arquivo <code className="text-purple-300">.env.local</code>:</p>
          <code className="block bg-black/40 rounded-xl p-3 text-green-400 text-sm">META_ACCESS_TOKEN=seu_token_aqui</code>
          <p className="text-zinc-500 text-xs mt-2">Você pode gerar um token em developers.facebook.com → Graph API Explorer</p>
        </div>
      )}

      {clients.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-zinc-400">Nenhum cliente com conta Meta configurada.</p>
          <p className="text-zinc-500 text-sm mt-1">Edite um cliente e adicione o ID da conta de anúncios do Meta.</p>
        </div>
      )}

      {selectedClient && (
        <>
          {/* Header do cliente */}
          <div className="glass rounded-2xl p-4 mb-4 flex items-center gap-4">
            {selectedClient.logo_url && <img src={selectedClient.logo_url} className="w-12 h-12 rounded-xl object-contain" alt="" />}
            <div>
              <p className="font-bold text-white">{selectedClient.name}</p>
              <p className="text-xs text-zinc-400">
                Meta: {selectedClient.meta_account_id}{selectedClient.meta_account_id2 ? ` + ${selectedClient.meta_account_id2}` : ''}
              </p>
            </div>
            {loading && <div className="ml-auto text-zinc-400 text-sm animate-pulse">Buscando dados...</div>}
          </div>

          {data && !noToken && (
            <>
              {/* Cards principais */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                <MetricCard label="Investimento Meta" value={fmtBRL(totalSpend)} color="text-blue-400" />
                <MetricCard label="Impressões" value={fmtNum(impressions1 + impressions2)} />
                <MetricCard label="Alcance Total" value={fmtNum(reach1 + reach2)} />
                <MetricCard label="Cliques" value={fmtNum(clicks1 + clicks2)} />
                {totalLeads > 0 && <MetricCard label="Leads Gerados" value={fmtNum(totalLeads)} color="text-green-400" />}
                {cpl > 0 && <MetricCard label="Custo por Lead" value={fmtBRL(cpl)} color="text-yellow-400" />}
              </div>

              {/* ROAS */}
              {(roasGeral > 0 || roas1 > 0 || roas2 > 0) && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="glass rounded-2xl p-5 text-center">
                    <p className="text-zinc-400 text-sm">ROAS Geral</p>
                    <p className="text-4xl font-black text-white">{roasGeral.toFixed(2)}</p>
                  </div>
                  {roas1 > 0 && (
                    <div className="glass rounded-2xl p-5 text-center">
                      <p className="text-zinc-400 text-sm">ROAS {acc1?.account_name || 'Conta 1'}</p>
                      <p className="text-4xl font-black text-green-400">{roas1.toFixed(2)}</p>
                    </div>
                  )}
                  {roas2 > 0 && (
                    <div className="glass rounded-2xl p-5 text-center">
                      <p className="text-zinc-400 text-sm">ROAS {acc2?.account_name || 'Conta 2'}</p>
                      <p className="text-4xl font-black text-blue-400">{roas2.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Funis lado a lado */}
              <div className="flex gap-4 mb-4">
                {acc1 && (
                  <Funnel
                    title={`📱 ${acc1.account_name || 'Conta 1'} (WhatsApp/Contact)`}
                    color="text-blue-400"
                    data={[
                      { label: 'Investimento', value: fmtBRL(spend1) },
                      { label: 'Alcance', value: fmtNum(reach1) },
                      { label: 'Cliques', value: fmtNum(clicks1), sub: `CTR ${fmtPct(acc1?.ctr)}` },
                      ...(leads1 > 0 ? [{ label: 'Leads Gerados', value: fmtNum(leads1), sub: `CPL ${fmtBRL(spend1 / leads1)}` }] : []),
                    ]}
                  />
                )}
                {acc2 && (
                  <Funnel
                    title={`🛒 ${acc2.account_name || 'Conta 2'} (Lojas/Site)`}
                    color="text-orange-400"
                    data={[
                      { label: 'Investimento', value: fmtBRL(spend2) },
                      { label: 'Alcance', value: fmtNum(reach2) },
                      { label: 'Cliques', value: fmtNum(clicks2), sub: `CTR ${fmtPct(acc2?.ctr)}` },
                      ...(purchases2 > 0 ? [{ label: 'Conversões', value: fmtNum(purchases2) }] : []),
                    ]}
                  />
                )}
              </div>

              {/* Métricas de qualidade */}
              <div className="glass rounded-2xl p-5">
                <h2 className="font-bold text-white mb-4 text-sm">📊 Qualidade das Campanhas</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {acc1 && <>
                    <div><p className="text-xs text-zinc-400">CPM ({acc1.account_name || 'Conta 1'})</p><p className="text-white font-bold">{fmtMetric(acc1.cpm)}</p></div>
                    <div><p className="text-xs text-zinc-400">CPC ({acc1.account_name || 'Conta 1'})</p><p className="text-white font-bold">{fmtMetric(acc1.cpc)}</p></div>
                  </>}
                  {acc2 && <>
                    <div><p className="text-xs text-zinc-400">CPM ({acc2.account_name || 'Conta 2'})</p><p className="text-white font-bold">{fmtMetric(acc2.cpm)}</p></div>
                    <div><p className="text-xs text-zinc-400">CPC ({acc2.account_name || 'Conta 2'})</p><p className="text-white font-bold">{fmtMetric(acc2.cpc)}</p></div>
                  </>}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
