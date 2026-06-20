// Migra os dados do backup JSON para o banco Turso.
// Uso:
//   TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="ey..." node scripts/migrate-to-turso.mjs
//
// Senhas: APIs não expõem hashes, então todos os usuários recebem uma senha
// temporária (TEMP_PASSWORD). Cada um troca no primeiro acesso (tela de perfil).

import { createClient } from '@libsql/client'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'

const TEMP_PASSWORD = 'Invollve@2026'

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN
if (!url || !authToken) {
  console.error('Defina TURSO_DATABASE_URL e TURSO_AUTH_TOKEN no ambiente.')
  process.exit(1)
}

const backup = JSON.parse(readFileSync(new URL('../backup-dados-2026-06-06.json', import.meta.url)))
const db = createClient({ url, authToken })

const TABLES = [
  `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'staff', avatar_url TEXT, birthday TEXT, phone TEXT, created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, company TEXT, email TEXT, phone TEXT, stage TEXT DEFAULT 'prospeccao', value REAL, notes TEXT, responsible_id INTEGER, created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, content TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS clients (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT, phone TEXT, company TEXT, notes TEXT, status TEXT DEFAULT 'ativo', meta_account_id TEXT, meta_account_id2 TEXT, google_ads_id TEXT, instagram_id TEXT, logo_url TEXT, created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT, status TEXT DEFAULT 'todo', priority TEXT DEFAULT 'media', assigned_to INTEGER, client_id INTEGER, due_date TEXT, created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS financial_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, description TEXT NOT NULL, amount REAL NOT NULL, category TEXT, status TEXT DEFAULT 'pendente', due_date TEXT, paid_date TEXT, client_id INTEGER, created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS rh_people (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, role TEXT, birthday TEXT, email TEXT, phone TEXT, notes TEXT, created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS drive_links (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, url TEXT NOT NULL, category TEXT, client_id INTEGER, created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS meetings (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT, meet_link TEXT, start_time TEXT NOT NULL, end_time TEXT, attendees TEXT, client_id INTEGER, created_by INTEGER, created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS client_data (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER NOT NULL, metric TEXT NOT NULL, value TEXT, period TEXT, notes TEXT, updated_at TEXT DEFAULT (datetime('now')))`,
]

async function run() {
  console.log('Criando tabelas...')
  for (const sql of TABLES) await db.execute(sql)

  const hash = await bcrypt.hash(TEMP_PASSWORD, 10)

  console.log('Inserindo usuários...')
  for (const u of backup.users) {
    await db.execute({
      sql: 'INSERT OR REPLACE INTO users (id, name, email, password, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [u.id, u.name, u.email, hash, u.role, u.created_at],
    })
  }

  console.log('Inserindo clientes...')
  for (const c of backup.clients) {
    await db.execute({
      sql: 'INSERT OR REPLACE INTO clients (id, name, email, phone, company, notes, status, meta_account_id, meta_account_id2, google_ads_id, instagram_id, logo_url, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      args: [c.id, c.name, c.email, c.phone, c.company, c.notes, c.status, c.meta_account_id, c.meta_account_id2, c.google_ads_id, c.instagram_id, c.logo_url, c.created_at],
    })
  }

  console.log('Inserindo tarefas...')
  for (const t of backup.tasks) {
    await db.execute({
      sql: 'INSERT OR REPLACE INTO tasks (id, title, description, status, priority, assigned_to, client_id, due_date, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
      args: [t.id, t.title, t.description, t.status, t.priority, t.assigned_to, t.client_id, t.due_date, t.created_at],
    })
  }

  console.log('Inserindo financeiro...')
  for (const f of backup.financial_entries) {
    await db.execute({
      sql: 'INSERT OR REPLACE INTO financial_entries (id, type, description, amount, category, status, due_date, paid_date, client_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      args: [f.id, f.type, f.description, f.amount, f.category, f.status, f.due_date, f.paid_date, f.client_id, f.created_at],
    })
  }

  console.log('Inserindo RH...')
  for (const p of backup.rh_people) {
    await db.execute({
      sql: 'INSERT OR REPLACE INTO rh_people (id, name, role, birthday, email, phone, notes, created_at) VALUES (?,?,?,?,?,?,?,?)',
      args: [p.id, p.name, p.role, p.birthday, p.email, p.phone, p.notes, p.created_at],
    })
  }

  console.log('Inserindo reuniões...')
  for (const m of backup.meetings) {
    await db.execute({
      sql: 'INSERT OR REPLACE INTO meetings (id, title, description, meet_link, start_time, end_time, attendees, client_id, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      args: [m.id, m.title, m.description, m.meet_link, m.start_time, m.end_time, m.attendees, m.client_id, m.created_by, m.created_at],
    })
  }

  console.log('Inserindo chat...')
  for (const ch of backup.chat_messages) {
    await db.execute({
      sql: 'INSERT OR REPLACE INTO chat_messages (id, user_id, content, created_at) VALUES (?,?,?,?)',
      args: [ch.id, ch.user_id, ch.content, ch.created_at],
    })
  }

  const r = await db.execute('SELECT COUNT(*) as c FROM users')
  console.log(`\nPronto! Usuários no Turso: ${r.rows[0].c}`)
  console.log(`Senha temporária de todos: ${TEMP_PASSWORD}`)
}

run().catch((e) => { console.error('Erro:', e); process.exit(1) })
