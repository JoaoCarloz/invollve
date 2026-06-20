import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

const META_TOKEN = process.env.META_ACCESS_TOKEN
const IG_ID = '17841400315502599'

async function igInsights(since: string, until: string) {
  if (!META_TOKEN) return []
  const sinceTs = Math.floor(new Date(since).getTime() / 1000)
  const untilTs = Math.floor(new Date(until + 'T23:59:59').getTime() / 1000)
  const metrics = 'views,reach,profile_views,website_clicks,total_interactions'
  const url = `https://graph.facebook.com/v22.0/${IG_ID}/insights?metric=${metrics}&metric_type=total_value&period=day&since=${sinceTs}&until=${untilTs}&access_token=${META_TOKEN}`
  try {
    const res = await fetch(url, { cache: 'no-store' })
    const json = await res.json()
    if (json.error) return []
    return json.data || []
  } catch { return [] }
}

async function igProfile() {
  if (!META_TOKEN) return null
  const url = `https://graph.facebook.com/v22.0/${IG_ID}?fields=followers_count,media_count,username&access_token=${META_TOKEN}`
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

function getValue(data: any[], name: string): number {
  const item = data?.find((d: any) => d.name === name)
  return item?.total_value?.value || 0
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  if (!META_TOKEN) {
    return NextResponse.json({ needs_token: true, followers: 0, reach: 0, views: 0, profileViews: 0, websiteClicks: 0, totalInteractions: 0, mediaCount: 0, username: 'realequipamentos' })
  }

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')

  let since: string, until: string
  if (month) {
    const [y, m] = month.split('-')
    const lastDay = new Date(Number(y), Number(m), 0).getDate()
    since = `${month}-01`
    until = `${month}-${String(lastDay).padStart(2, '0')}`
  } else {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate()
    since = `${y}-${m}-01`
    until = `${y}-${m}-${lastDay}`
  }

  // Split into two fetches if month spans > 28 days to stay under 30-day limit
  const [insightsData, profileData] = await Promise.all([
    igInsights(since, until),
    igProfile(),
  ])

  return NextResponse.json({
    period: { since, until },
    views: getValue(insightsData, 'views'),
    reach: getValue(insightsData, 'reach'),
    profileViews: getValue(insightsData, 'profile_views'),
    websiteClicks: getValue(insightsData, 'website_clicks'),
    totalInteractions: getValue(insightsData, 'total_interactions'),
    followers: profileData?.followers_count || 0,
    mediaCount: profileData?.media_count || 0,
    username: profileData?.username || 'realequipamentos',
    tokenSet: !!META_TOKEN,
  })
}
