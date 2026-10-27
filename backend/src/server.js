import 'dotenv/config'
import app from './app.js'
import { pool } from './db/pool.js'

const port = Number(process.env.PORT || 5000)
const server = app.listen(port, () => console.log(`BrandProof API listening on port ${port}`))

async function shutdown() {
  server.close(async () => { await pool.end(); process.exit(0) })
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
