import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('client_id')
  const data = clientId
    ? await db.all('SELECT * FROM client_data WHERE client_id = ? ORDER BY metric', [clientId])
    : await db.all('SELECT cd.*, c.name as client_name FROM client_data cd LEFT JOIN clients c ON cd.client_id = c.id ORDER BY c.name, cd.metric')
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'cliente') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const { client_id, metric, value, period, notes } = await req.json()
  const result = await db.run(
    'INSERT INTO client_data (client_id, metric, value, period, notes) VALUES (?, ?, ?, ?, ?)',
    [client_id, metric, value, period, notes]
  )
  return NextResponse.json({ id: result.lastInsertRowid })
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'cliente') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const { id, ...body } = await req.json()
  await db.run(
    `UPDATE client_data SET metric=?, value=?, period=?, notes=?, updated_at=datetime('now') WHERE id=?`,
    [body.metric, body.value, body.period, body.notes, id]
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'cliente') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const { id } = await req.json()
  await db.run('DELETE FROM client_data WHERE id = ?', [id])
  return NextResponse.json({ ok: true })
}
