import { NextResponse } from 'next/server'
import db from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET() {
  const row = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM users')
  const count = row?.c ?? 0
  if (count > 0) {
    return NextResponse.json({ message: 'Banco já inicializado', users: count })
  }

  const hash = await bcrypt.hash('invollve2024', 10)
  await db.run(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    ['Alexandre', 'admin@invollve.com.br', hash, 'socio']
  )

  return NextResponse.json({
    ok: true,
    message: 'Usuário admin criado!',
    email: 'admin@invollve.com.br',
    senha: 'invollve2024'
  })
}
