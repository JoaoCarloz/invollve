import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session || session.role === 'cliente') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const meetings = await db.all(`
    SELECT m.*, c.name as client_name, u.name as creator_name FROM meetings m
    LEFT JOIN clients c ON m.client_id = c.id
    LEFT JOIN users u ON m.created_by = u.id
    ORDER BY m.start_time DESC
  `)
  return NextResponse.json(meetings)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'cliente') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const { title, description, meet_link, start_time, end_time, attendees, client_id } = await req.json()
  const result = await db.run(
    'INSERT INTO meetings (title, description, meet_link, start_time, end_time, attendees, client_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [title, description, meet_link, start_time, end_time, attendees, client_id || null, session.id]
  )
  return NextResponse.json({ id: result.lastInsertRowid })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'cliente') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const { id } = await req.json()
  await db.run('DELETE FROM meetings WHERE id = ?', [id])
  return NextResponse.json({ ok: true })
}
