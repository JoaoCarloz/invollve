import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getSession } from '@/lib/session'
import bcrypt from 'bcryptjs'

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { name, phone, birthday, avatar_url, current_password, new_password } = await req.json()

  await db.run('UPDATE users SET name=?, phone=?, birthday=?, avatar_url=? WHERE id=?',
    [name, phone || null, birthday || null, avatar_url || null, session.id])

  if (birthday) {
    const existing = await db.get<any>('SELECT id FROM rh_people WHERE email = ?', [session.email])
    if (existing) {
      await db.run('UPDATE rh_people SET birthday=?, name=? WHERE email=?', [birthday, name, session.email])
    } else {
      await db.run('INSERT INTO rh_people (name, role, birthday, email) VALUES (?, ?, ?, ?)', [name, 'Equipe', birthday, session.email])
    }
  }

  if (current_password && new_password) {
    const user = await db.get<any>('SELECT password FROM users WHERE id=?', [session.id])
    const valid = await bcrypt.compare(current_password, user.password)
    if (!valid) return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 })
    const hash = await bcrypt.hash(new_password, 10)
    await db.run('UPDATE users SET password=? WHERE id=?', [hash, session.id])
  }

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const user = await db.get('SELECT id, name, email, role, phone, birthday, avatar_url FROM users WHERE id=?', [session.id])
  return NextResponse.json(user)
}
