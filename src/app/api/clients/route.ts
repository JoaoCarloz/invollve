import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const clients = await db.all('SELECT * FROM clients ORDER BY name')
  return NextResponse.json(clients)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'cliente') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const { name, email, phone, company, notes, status, meta_account_id, meta_account_id2, google_ads_id, instagram_id, logo_url } = await req.json()
  const result = await db.run(
    'INSERT INTO clients (name, email, phone, company, notes, status, meta_account_id, meta_account_id2, google_ads_id, instagram_id, logo_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [name, email, phone, company, notes, status || 'ativo', meta_account_id || null, meta_account_id2 || null, google_ads_id || null, instagram_id || null, logo_url || null]
  )
  return NextResponse.json({ id: result.lastInsertRowid })
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'cliente') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const { id, ...body } = await req.json()
  await db.run(
    'UPDATE clients SET name=?, email=?, phone=?, company=?, notes=?, status=?, meta_account_id=?, meta_account_id2=?, google_ads_id=?, instagram_id=?, logo_url=? WHERE id=?',
    [body.name, body.email, body.phone, body.company, body.notes, body.status,
     body.meta_account_id || null, body.meta_account_id2 || null, body.google_ads_id || null, body.instagram_id || null, body.logo_url || null, id]
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || !['socio'].includes(session.role)) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const { id } = await req.json()
  await db.run('DELETE FROM clients WHERE id = ?', [id])
  return NextResponse.json({ ok: true })
}
