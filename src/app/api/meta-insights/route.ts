import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

const META_TOKEN = process.env.META_ACCESS_TOKEN

async function fetchAccountInsights(accountId: string, datePreset: string) {
  if (!META_TOKEN) return null
  const fields = [
    'account_name', 'spend', 'impressions', 'reach', 'clicks', 'ctr', 'cpc', 'cpm', 'cpp', 'frequency',
    'purchase_roas', 'results', 'cost_per_result',
    'actions', 'action_values', 'cost_per_action_type'
  ].join(',')

  const url = `https://graph.facebook.com/v22.0/act_${accountId}/insights?fields=${fields}&date_preset=${datePreset}&access_token=${META_TOKEN}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  return data.data?.[0] || null
}

async function fetchInstagramInsights(igAccountId: string) {
  if (!META_TOKEN || !igAccountId) return null
  const url = `https://graph.facebook.com/v22.0/${igAccountId}?fields=followers_count,media_count,biography,website&access_token=${META_TOKEN}`
  const res = await fetch(url)
  if (!res.ok) return null
  return res.json()
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('account_id')
  const accountId2 = searchParams.get('account_id2')
  const igId = searchParams.get('ig_id')
  const datePreset = searchParams.get('date_preset') || 'this_month'

  if (!META_TOKEN) {
    return NextResponse.json({ error: 'META_ACCESS_TOKEN não configurado', needs_token: true }, { status: 200 })
  }

  const [acc1, acc2, ig] = await Promise.all([
    accountId ? fetchAccountInsights(accountId, datePreset) : null,
    accountId2 ? fetchAccountInsights(accountId2, datePreset) : null,
    igId ? fetchInstagramInsights(igId) : null,
  ])

  return NextResponse.json({ account1: acc1, account2: acc2, instagram: ig })
}
