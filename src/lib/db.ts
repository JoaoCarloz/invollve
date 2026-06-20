import { createClient, Client } from '@libsql/client'

const url = process.env.TURSO_DATABASE_URL ?? 'file:/tmp/invollve.db'
const authToken = process.env.TURSO_AUTH_TOKEN

let _client: Client | null = null

function getClient(): Client {
  if (!_client) {
    _client = authToken ? createClient({ url, authToken }) : createClient({ url })
  }
  return _client
}

const TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    avatar_url TEXT,
    birthday TEXT,
    phone TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    stage TEXT DEFAULT 'prospeccao',
    value REAL,
    notes TEXT,
    responsible_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    notes TEXT,
    status TEXT DEFAULT 'ativo',
    meta_account_id TEXT,
    meta_account_id2 TEXT,
    google_ads_id TEXT,
    instagram_id TEXT,
    logo_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo',
    priority TEXT DEFAULT 'media',
    assigned_to INTEGER,
    client_id INTEGER,
    due_date TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS financial_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT,
    status TEXT DEFAULT 'pendente',
    due_date TEXT,
    paid_date TEXT,
    client_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS rh_people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT,
    birthday TEXT,
    email TEXT,
    phone TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS drive_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    category TEXT,
    client_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS meetings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    meet_link TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT,
    attendees TEXT,
    client_id INTEGER,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS client_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    metric TEXT NOT NULL,
    value TEXT,
    period TEXT,
    notes TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
]

let _initialized = false

async function ensureInit() {
  if (_initialized) return
  const client = getClient()
  for (const sql of TABLES) {
    await client.execute(sql)
  }
  _initialized = true
}

const db = {
  async get<T = any>(sql: string, args: any[] = []): Promise<T | null> {
    await ensureInit()
    const r = await getClient().execute({ sql, args })
    return (r.rows[0] as unknown as T) ?? null
  },
  async all<T = any>(sql: string, args: any[] = []): Promise<T[]> {
    await ensureInit()
    const r = await getClient().execute({ sql, args })
    return r.rows as unknown as T[]
  },
  async run(sql: string, args: any[] = []): Promise<{ lastInsertRowid: number | bigint }> {
    await ensureInit()
    const r = await getClient().execute({ sql, args })
    return { lastInsertRowid: r.lastInsertRowid ?? 0 }
  },
}

export default db
