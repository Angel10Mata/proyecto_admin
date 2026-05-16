import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRoutes   from './routes/auth.js'
import uploadRoutes from './routes/upload.js'
import { testConnection } from './config/db.js'

const app  = express()
const PORT = process.env.PORT || 4000

// ── Middlewares ──────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── Rutas ────────────────────────────────────────────────
app.use('/api/auth',   authRoutes)
app.use('/api/upload', uploadRoutes)

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }))

// 404
app.use((_req, res) => res.status(404).json({ message: 'Ruta no encontrada' }))

// Error handler global
app.use((err, _req, res, _next) => {
  console.error('[GlobalError]', err)
  res.status(err.status || 500).json({ message: err.message || 'Error interno' })
})

// ── Iniciar servidor ─────────────────────────────────────
async function start() {
  await testConnection()
  app.listen(PORT, () => {
    console.log(`🚀 Backend corriendo en http://localhost:${PORT}`)
  })
}

start().catch((err) => {
  console.error('❌ Error al iniciar el servidor:', err.message)
  process.exit(1)
})
