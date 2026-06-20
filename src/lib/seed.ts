import db from './db'
import bcrypt from 'bcryptjs'

export async function seedAdmin() {
  const existing = await db.get('SELECT id FROM users WHERE email = ?', ['admin@invollve.com'])
  if (existing) return

  const hash = await bcrypt.hash('invollve2024', 10)
  await db.run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [
    'Administrador', 'admin@invollve.com', hash, 'socio'
  ])
  console.log('Admin criado: admin@invollve.com / invollve2024')
}
