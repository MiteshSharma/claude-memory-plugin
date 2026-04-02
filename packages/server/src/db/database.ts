import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema/index.js'
import { runMigrations } from './migrations.js'

export type RawDb = InstanceType<typeof Database>
export type Db = BetterSQLite3Database<typeof schema>

export function initDatabase(filePath: string): { db: Db; raw: RawDb } {
  const raw = new Database(filePath)
  raw.pragma('journal_mode = WAL')
  raw.pragma('synchronous = NORMAL')
  raw.pragma('foreign_keys = ON')
  raw.pragma('cache_size = 10000')
  runMigrations(raw)
  const db = drizzle(raw, { schema })
  console.log(`[db] ready at ${filePath}`)
  return { db, raw }
}
