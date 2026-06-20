import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'socio') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const entries = await db.all(`
    SELECT f.*, c.name as client_name FROM financial_entries f
    LEFT JOIN clients c ON f.client_id = c.id
    ORDER BY f.due_date DESC
  `)
  return NextResponse.json(entries)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'socio') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const { type, description, amount, category, status, due_date, paid_date, client_id } = await req.json()
  const result = await db.run(
    'INSERT INTO financial_entries (type, description, amount, category, status, due_date, paid_date, client_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [type, description, amount, category, status || 'pendente', due_date || null, paid_date || null, client_id || null]
  )
  return NextResponse.json({ id: Number(result.lastInsertRowid) })
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'socio') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const { id, ...body } = await req.json()
  await db.run(
    'UPDATE financial_entries SET type=?, description=?, amount=?, category=?, status=?, due_date=?, paid_date=?, client_id=? WHERE id=?',
    [body.type, body.description, body.amount, body.category, body.status, body.due_date || null, body.paid_date || null, body.client_id || null, id]
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'socio') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const { id } = await req.json()
  await db.run('DELETE FROM financial_entries WHERE id = ?', [id])
  return NextResponse.json({ ok: true })
}
