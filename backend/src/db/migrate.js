import dotenv from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runner } from 'node-pg-migrate'

const here = dirname(fileURLToPath(import.meta.url))
dotenv.config({
  path: [resolve(here, '../../.env'), resolve(here, '../../../.env.local')],
})

const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('Set DATABASE_URL or DATABASE_URL_UNPOOLED in the environment or an env file.')
}

const direction = process.argv[2] === 'down' ? 'down' : 'up'
await runner({
  databaseUrl,
  dir: resolve(here, '../../migrations'),
  direction,
  migrationsTable: 'pgmigrations',
})
