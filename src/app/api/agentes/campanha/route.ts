import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const META_TOKEN = process.env.META_ACCESS_TOKEN

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !['socio', 'gestor_trafego'].includes(session.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { briefing, account_id, action } = await req.json()

  // Step 1: Use Claude to interpret briefing and generate campaign structure
  if (action === 'gerar_estrutura') {
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurada', needs_key: true })
    }

    const prompt = `Você é um especialista em Meta Ads (Facebook/Instagram). Com base no briefing abaixo, gere uma estrutura completa de campanha.

BRIEFING:
${briefing}

Responda APENAS com JSON válido neste formato:
{
  "nome_campanha": "...",
  "objetivo": "OUTCOME_LEADS | OUTCOME_SALES | OUTCOME_AWARENESS | OUTCOME_TRAFFIC",
  "publico_sugerido": {
    "faixa_etaria": "18-65",
    "genero": "ALL | MALE | FEMALE",
    "interesses": ["..."],
    "localizacao": "..."
  },
  "orcamento_diario_sugerido": 50,
  "duracao_dias": 30,
  "criativos_sugeridos": [
    { "formato": "imagem | video | carrossel", "titulo": "...", "texto": "...", "cta": "LEARN_MORE | SIGN_UP | CONTACT_US | SHOP_NOW" }
  ],
  "estrategia_lance": "LOWEST_COST | COST_CAP | BID_CAP",
  "posicionamentos": ["feed", "stories", "reels"],
  "observacoes": "..."
}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await res.json()
    const text = data.content?.[0]?.text || ''

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      const estrutura = JSON.parse(jsonMatch?.[0] || '{}')
      return NextResponse.json({ estrutura, raw: text })
    } catch {
      return NextResponse.json({ error: 'Erro ao interpretar briefing', raw: text })
    }
  }

  // Step 2: Create campaign on Meta
  if (action === 'criar_campanha') {
    if (!META_TOKEN) {
      return NextResponse.json({ error: 'META_ACCESS_TOKEN não configurado', needs_token: true })
    }
    if (!account_id) {
      return NextResponse.json({ error: 'account_id obrigatório' }, { status: 400 })
    }

    const { estrutura } = await req.json().catch(() => ({ estrutura: null })) || { estrutura: briefing }

    // Create campaign
    const campRes = await fetch(`https://graph.facebook.com/v22.0/act_${account_id}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: estrutura.nome_campanha || 'Nova Campanha',
        objective: estrutura.objetivo || 'OUTCOME_LEADS',
        status: 'PAUSED',
        special_ad_categories: [],
        access_token: META_TOKEN,
      }),
    })
    const campData = await campRes.json()

    if (campData.error) {
      return NextResponse.json({ error: campData.error.message, meta_error: campData.error })
    }

    return NextResponse.json({
      success: true,
      campaign_id: campData.id,
      message: `Campanha "${estrutura.nome_campanha}" criada com status PAUSADA. Revise e ative no Gerenciador de Anúncios.`,
    })
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}
