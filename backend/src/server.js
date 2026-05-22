import fs from 'node:fs'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { DATA_DIR, PORT, UPLOAD_DIR } from './config.js'
import { initializeDatabase } from './db.js'
import authRoutes from './routes/auth.js'
import publicRoutes from './routes/public.js'
import adminRoutes from './routes/admin.js'

fs.mkdirSync(DATA_DIR, { recursive: true })
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const app = express()

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
)
app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.use(morgan('dev'))
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
)
app.use('/uploads', express.static(UPLOAD_DIR))
app.use('/api/auth', authRoutes)
app.use('/api/public', publicRoutes)
app.use('/api/admin', adminRoutes)

app.get('/api/health', (_request, response) => {
  response.json({ ok: true })
})

app.use((error, _request, response, _next) => {
  console.error(error)
  response.status(500).json({ message: '服务器内部错误' })
})

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend running at http://localhost:${PORT}`)
    })
  })
  .catch((error) => {
    console.error('Failed to initialize database', error)
    process.exit(1)
  })
