import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

// Sheet IDs and GIDs
const ADVERONIX_ID = '125qB1LnutVH10WqsWMUlKbFS-dyhPZoH_iG6RlD4Rgg'
const ADVERONIX_GID = '702921584'
const ADVERONIX_LOJAS_GID = '30276283'
const VENDAS_ID = '1wSMYg2sFfFLVAYTyuXitxG28d-BC49WTpOlAvcAx_HM'
const VENDAS_GID = '1698326152'
const LOJAS_ID = '1KJc5D3YcEGmmlEp-xo4ORnz2kPSf7zWIbeBGT5Yh5J8'
const LOJAS_TABS = [
  { nome: 'Centro', gid: '0' },
  { nome: 'Grande Circular', gid: '1728478791' },
  { nome: 'Cidade de Deus', gid: '2022180015' },
  { nome: 'Santarém 002', gid: '1351953028' },
  { nome: 'Parintins', gid: '1065293445' },
]

// Origins counted as "influenciado pela Invollve" (lowercase comparison)
const INVOLLVE_ORIGINS = [
  'facebook', 'instagram', 'whatsapp',
  'site(e-commerce)', 'site(e-commerce) incentivo', 'site (e-commerce) incentivo',
  'site(e-commerce) recorrência', 'site(e-commerce) recorrencia',
  'site (e-commerce) recorrência', 'site (e-commerce) recorrencia',
  'site(e-commerce) recuperação', 'site(e-commerce) recuperacao',
  'site (e-commerce) recuperação', 'site (e-commerce) recuperacao',
  'site(link)',
]
const WHATSAPP_ORIGINS = ['whatsapp']
const SITE_ORIGINS = [
  'site(e-commerce)', 'site(e-commerce) incentivo', 'site (e-commerce) incentivo',
  'site(e-commerce) recorrência', 'site(e-commerce) recorrencia',
  'site (e-commerce) recorrência', 'site (e-commerce) recorrencia',
  'site(e-commerce) recuperação', 'site(e-commerce) recuperacao',
  'site (e-commerce) recuperação', 'site (e-commerce) recuperacao',
  'site(link)',
]

const META_TOKEN = process.env.META_ACCESS_TOKEN
const REAL_LOJAS_ACCOUNT = '686437226358753'

async function fetchMetaSpend(accountId: string, from: string, to: string): Promise<number> {
  if (!META_TOKEN) return 0
  const url = `https://graph.facebook.com/v22.0/act_${accountId}/insights?fields=spend&time_range={"since":"${from}","until":"${to}"}&access_token=${META_TOKEN}`
  try {
    const res = await fetch(url, { next: { revalidate: 300 } })
    if (!res.ok) return 0
    const json = await res.json()
    return parseFloat(json.data?.[0]?.spend || '0')
  } catch { return 0 }
}

function csvUrl(id: string, gid: string) {
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`
}

async function fetchCSV(id: string, gid: string): Promise<string[][]> {
  const res = await fetch(csvUrl(id, gid), { next: { revalidate: 300 } })
  if (!res.ok) return []
  const text = await res.text()
  return text.split('\n')
    .map(line => {
      // Parse CSV properly (handle quoted fields)
      const cols: string[] = []
      let cur = '', inQ = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') { inQ = !inQ }
        else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
        else { cur += ch }
      }
      cols.push(cur.trim())
      return cols
    })
    .filter(r => r.some(c => c))
}

function parseBRL(v: string): number {
  if (!v) return 0
  // Brazilian format: R$ 3.798,00 → remove R$, spaces, dots (thousands sep), replace comma with dot
  const cleaned = v.replace(/[^0-9,\-]/g, '').replace(',', '.')
  // If there were dots as thousands separators they're already removed above
  // But we need to handle: "3798.00" (already converted) vs original with dots
  return parseFloat(cleaned) || 0
}

function parseDate(v: string): string {
  // Supports DD/MM/YYYY and YYYY-MM-DD
  if (!v) return ''
  if (v.includes('/')) {
    const [d, m, y] = v.split('/')
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return v.substring(0, 10)
}

function inPeriod(dateStr: string, from: string, to: string): boolean {
  if (!dateStr) return false
  return dateStr >= from && dateStr <= to
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  // Expect ?from=YYYY-MM-DD&to=YYYY-MM-DD OR ?month=YYYY-MM
  let from = searchParams.get('from') || ''
  let to = searchParams.get('to') || ''
  const month = searchParams.get('month')
  if (month) {
    const [y, m] = month.split('-')
    const lastDay = new Date(Number(y), Number(m), 0).getDate()
    from = `${month}-01`
    to = `${month}-${String(lastDay).padStart(2, '0')}`
  }
  if (!from) {
    // Default: current month
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate()
    from = `${y}-${m}-01`
    to = `${y}-${m}-${lastDay}`
  }

  // Fetch all sources in parallel
  const [advRows, advLojasRows, vendasRows, ...lojasRowsArr] = await Promise.all([
    fetchCSV(ADVERONIX_ID, ADVERONIX_GID),
    fetchCSV(ADVERONIX_ID, ADVERONIX_LOJAS_GID),
    fetchCSV(VENDAS_ID, VENDAS_GID),
    ...LOJAS_TABS.map(t => fetchCSV(LOJAS_ID, t.gid)),
  ])

  // ── ADVERONIX (Contact) ────────────────────────────────────────────────────
  let totalInvestMeta = 0, totalLeads = 0, totalReach = 0,
    totalImpressions = 0, totalClicks = 0

  for (let i = 1; i < advRows.length; i++) {
    const r = advRows[i]
    const day = parseDate(r[9] || '')
    if (!inPeriod(day, from, to)) continue
    totalClicks += parseFloat(r[3]) || 0
    totalLeads += parseFloat(r[4]) || 0
    totalReach += parseFloat(r[5]) || 0
    totalInvestMeta += parseBRL(r[6])
    totalImpressions += parseFloat(r[7]) || 0
  }

  // ── ADVERONIX (Lojas) ──────────────────────────────────────────────────────
  let totalInvestMetaLojasSheet = 0

  for (let i = 1; i < advLojasRows.length; i++) {
    const r = advLojasRows[i]
    const day = parseDate(r[9] || '')
    if (!inPeriod(day, from, to)) continue
    totalInvestMetaLojasSheet += parseBRL(r[6])
  }

  // ── VENDAS (Contact Center) ────────────────────────────────────────────────
  // Headers: Nro. nota, Data Negociação, Nome Parceiro, Valor, ORIGEM, CONSULTOR, ID da Conversa, Grupo de Faturamento
  let totalVendas = 0, totalInvollve = 0
  let totalWhatsapp = 0, countWhatsapp = 0
  let totalSite = 0, countSite = 0
  let countVendasWhatsappSales = 0
  const consultorMap: Record<string, number> = {}

  for (let i = 1; i < vendasRows.length; i++) {
    const r = vendasRows[i]
    const dateStr = parseDate(r[1] || '')
    if (!inPeriod(dateStr, from, to)) continue
    const valor = parseBRL(r[3])
    const origem = (r[4] || '').toLowerCase().trim()
    const consultor = (r[5] || '').trim()
    if (valor <= 0) continue

    totalVendas += valor
    consultorMap[consultor] = (consultorMap[consultor] || 0) + valor

    const isInvollve = INVOLLVE_ORIGINS.includes(origem)
    if (isInvollve) totalInvollve += valor

    const isWhatsapp = WHATSAPP_ORIGINS.includes(origem)
    if (isWhatsapp) {
      totalWhatsapp += valor
      countWhatsapp++
      if (valor > 0) countVendasWhatsappSales++
    }

    const isSite = SITE_ORIGINS.includes(origem)
    if (isSite) {
      totalSite += valor
      countSite++
    }
  }

  // ── LOJAS ──────────────────────────────────────────────────────────────────
  // Each tab: Data Negociação, Nome Parceiro, Valor, CONSULTOR
  let totalLojas = 0
  const lojasByStore: Record<string, number> = {}

  for (let t = 0; t < LOJAS_TABS.length; t++) {
    const rows = lojasRowsArr[t]
    const nome = LOJAS_TABS[t].nome
    let storeTotal = 0
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      const dateStr = parseDate(r[0] || '')
      if (!inPeriod(dateStr, from, to)) continue
      const valor = parseBRL(r[2])
      if (valor <= 0) continue
      storeTotal += valor
      totalLojas += valor
    }
    lojasByStore[nome] = storeTotal
  }

  // ── CALCULATED METRICS ────────────────────────────────────────────────────
  const totalInvestMetaContact = totalInvestMeta
  const totalInvestMetaLojas = totalInvestMetaLojasSheet
  const totalInvestMetaTotal = totalInvestMetaContact + totalInvestMetaLojas
  const resultadoGeral = totalInvollve + totalLojas
  const roasGeral = totalInvestMetaTotal > 0 ? resultadoGeral / totalInvestMetaTotal : 0
  const roasContact = totalInvestMetaContact > 0 ? totalInvollve / totalInvestMetaContact : 0
  const roasLojas = totalInvestMetaLojas > 0 ? totalLojas / totalInvestMetaLojas : 0
  const cpl = totalLeads > 0 ? totalInvestMetaContact / totalLeads : 0
  const ticketMedioWhatsapp = countWhatsapp > 0 ? totalWhatsapp / countWhatsapp : 0
  const ticketMedioSite = countSite > 0 ? totalSite / countSite : 0
  const taxaConversaoWhatsapp = totalLeads > 0 ? countVendasWhatsappSales / totalLeads : 0
  const cpm = totalImpressions > 0 ? (totalInvestMeta / totalImpressions) * 1000 : 0

  return NextResponse.json({
    period: { from, to },
    // Top KPIs
    geralSetorContact: totalVendas,
    influenciadoInvollve: totalInvollve,
    investimentoMeta: totalInvestMetaTotal,
    investimentoMetaContact: totalInvestMetaContact,
    investimentoMetaLojas: totalInvestMetaLojas,
    leadsGerados: totalLeads,
    custoporLead: cpl,
    // Middle
    resultadoGeral,
    influenciadoContactCenter: totalInvollve,
    influenciadoLojas: totalLojas,
    roasGeral,
    roasContact,
    roasLojas,
    // WhatsApp funnel
    whatsapp: {
      valor: totalWhatsapp,
      ticketMedio: ticketMedioWhatsapp,
      alcance: totalReach,
      leadsGerados: totalLeads,
      vendas: countVendasWhatsappSales,
      taxaConversao: taxaConversaoWhatsapp,
    },
    // Site funnel
    site: {
      valor: totalSite,
      ticketMedio: ticketMedioSite,
      vendas: countSite,
    },
    // Extras
    impressoes: totalImpressions,
    cliques: totalClicks,
    cpm,
    lojasByStore,
    consultorMap,
  })
}
