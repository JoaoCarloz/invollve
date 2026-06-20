import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session || session.role === 'cliente') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const leads = await db.all(`
    SELECT l.*, u.name as responsible_name FROM leads l
    LEFT JOIN users u ON l.responsible_id = u.id
    ORDER BY l.created_at DESC
  `)
  return NextResponse.json(leads)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'cliente') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const { name, company, email, phone, stage, value, notes, responsible_id } = await req.json()
  const result = await db.run(
    'INSERT INTO leads (name, company, email, phone, stage, value, notes, responsible_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [name, company, email, phone, stage || 'prospeccao', value || null, notes, responsible_id || null]
  )
  return NextResponse.json({ id: result.lastInsertRowid })
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'cliente') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const { id, ...body } = await req.json()
  await db.run(
    'UPDATE leads SET name=?, company=?, email=?, phone=?, stage=?, value=?, notes=?, responsible_id=? WHERE id=?',
    [body.name, body.company, body.email, body.phone, body.stage, body.value || null, body.notes, body.responsible_id || null, id]
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'cliente') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const { id } = await req.json()
  await db.run('DELETE FROM leads WHERE id = ?', [id])
  return NextResponse.json({ ok: true })
}
