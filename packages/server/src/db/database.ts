import Database from 'better-sqlite3'
import { runMigrations } from './migrations.js'

export type Db = InstanceType<typeof Database>

export function initDatabase(filePath: string): Db {
  const db = new Database(filePath)
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('foreign_keys = ON')
  db.pragma('cache_size = 10000')
  runMigrations(db)
  console.log(`[db] ready at ${filePath}`)
  return db
}
