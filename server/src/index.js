import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { UPLOADS_DIR } from './middleware/upload.js'

import authRoutes from './routes/auth.js'
import orgsRoutes from './routes/orgs.js'
import usersRoutes from './routes/users.js'
import categoriesRoutes from './routes/categories.js'
import productsRoutes from './routes/products.js'
import employeesRoutes from './routes/employees.js'
import transactionsRoutes from './routes/transactions.js'
import assignmentsRoutes from './routes/assignments.js'
import roomsRoutes from './routes/rooms.js'
import printersRoutes from './routes/printers.js'
import scanRoutes from './routes/scan.js'
import scanPairRoutes from './routes/scanPair.js'
import reportsRoutes from './routes/reports.js'
import notificationsRoutes from './routes/notifications.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(cors())
app.use(express.json({ limit: '5mb' }))
app.use('/uploads', express.static(UPLOADS_DIR))

app.get('/api/health', (_req, res) => res.json({ ok: true, name: 'tizims-ombor-server' }))

app.use('/api/auth', authRoutes)
app.use('/api/orgs', orgsRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/categories', categoriesRoutes)
app.use('/api/products', productsRoutes)
app.use('/api/employees', employeesRoutes)
app.use('/api/transactions', transactionsRoutes)
app.use('/api/assignments', assignmentsRoutes)
app.use('/api/rooms', roomsRoutes)
app.use('/api/printers', printersRoutes)
app.use('/api/scan', scanRoutes)
app.use('/api/scan-pair', scanPairRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api/notifications', notificationsRoutes)

app.use((req, res) => res.status(404).json({ error: 'Topilmadi' }))

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Server xatosi' })
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`[tizims-ombor] server http://localhost:${PORT} portida ishga tushdi`)
})
