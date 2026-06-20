import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session || session.role === 'cliente') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const people = await db.all('SELECT * FROM rh_people ORDER BY name')
  return NextResponse.json(people)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'cliente') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const { name, role, birthday, email, phone, notes } = await req.json()
  const result = await db.run(
    'INSERT INTO rh_people (name, role, birthday, email, phone, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [name, role, birthday, email, phone, notes]
  )
  return NextResponse.json({ id: result.lastInsertRowid })
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'cliente') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const { id, ...body } = await req.json()
  await db.run(
    'UPDATE rh_people SET name=?, role=?, birthday=?, email=?, phone=?, notes=? WHERE id=?',
    [body.name, body.role, body.birthday, body.email, body.phone, body.notes, id]
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || !['socio'].includes(session.role)) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const { id } = await req.json()
  await db.run('DELETE FROM rh_people WHERE id = ?', [id])
  return NextResponse.json({ ok: true })
}
