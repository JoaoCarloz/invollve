import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { seedAdmin } from '@/lib/seed'
import bcrypt from 'bcryptjs'
import { createToken, UserSession } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  await seedAdmin()
  const { email, password } = await req.json()

  const user = await db.get<any>('SELECT * FROM users WHERE email = ?', [email])
  if (!user) return NextResponse.json({ error: 'Email ou senha inválidos' }, { status: 401 })

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) return NextResponse.json({ error: 'Email ou senha inválidos' }, { status: 401 })

  const session: UserSession = { id: user.id, name: user.name, email: user.email, role: user.role }
  const token = await createToken(session)

  const cookieStore = await cookies()
  cookieStore.set('invollve_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return NextResponse.json({ role: user.role, name: user.name })
}
