import pg from 'pg'
import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

// Prefer a backend-local .env (for a local PostgreSQL override), then fall back
// to the root .env.local populated by Neon CLI. Process environment wins both.
dotenv.config({
  path: [
    fileURLToPath(new URL('../../.env', import.meta.url)),
    fileURLToPath(new URL('../../../.env.local', import.meta.url)),
  ],
})

const { Pool } = pg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'false'
    ? false
    : (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('neon.tech') || process.env.PGSSL === 'true')
      ? { rejectUnauthorized: false }
      : false,
})

pool.on('error', (error) => console.error('Unexpected PostgreSQL pool error', error))

export async function inTransaction(work) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await work(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    try { await client.query('ROLLBACK') } catch { /* Preserve the original operation error. */ }
    throw error
  } finally {
    client.release()
  }
}
