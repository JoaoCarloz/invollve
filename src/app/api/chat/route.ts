import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session || session.role === 'cliente') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const messages = await db.all(`
    SELECT m.*, u.name as user_name, u.avatar_url FROM chat_messages m
    LEFT JOIN users u ON m.user_id = u.id
    ORDER BY m.created_at DESC
    LIMIT 100
  `)
  return NextResponse.json(messages.reverse())
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'cliente') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })
  const result = await db.run('INSERT INTO chat_messages (user_id, content) VALUES (?, ?)', [session.id, content.trim()])
  return NextResponse.json({ id: result.lastInsertRowid })
}
