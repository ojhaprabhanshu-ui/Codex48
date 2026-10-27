import express from 'express'
import cors from 'cors'
import api from './routes/api.js'
import { errorHandler } from './utils/http.js'

const app = express()
app.use(cors({ origin: process.env.FRONTEND_ORIGIN?.split(',').map((item) => item.trim()) || true }))
app.use(express.json({ limit: '64kb' }))
app.use('/api', api)
app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } }))
app.use(errorHandler)

export default app
