import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { getData, mutate } from '../db/lowdb.js'
import { signToken, requireAuth } from '../middleware/auth.js'
import { publicOrg, publicUser } from '../utils/serialize.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

// Public: list organizations for the login org-picker step
router.get('/orgs', (_req, res) => {
  res.json(getData().organizations.map(publicOrg))
})

router.post('/login', (req, res) => {
  const { orgId, identity, password } = req.body || {}
  const q = String(identity || '').trim().toLowerCase()
  if (!q || !password) return res.status(400).json({ error: 'Login va parolni kiriting' })

  const users = getData().users
  const user = users.find((u) => {
    if (u.username.toLowerCase() !== q && u.email.toLowerCase() !== q) return false
    if (u.role !== 'super_admin' && u.orgId !== orgId) return false
    return true
  })

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Login yoki parol noto\'g\'ri' })
  }
  if (user.blocked) return res.status(403).json({ error: 'Hisobingiz bloklangan. Administrator bilan bog\'laning.' })

  const org = getData().organizations.find((o) => o.id === user.orgId) || null
  res.json({ token: signToken(user), user: publicUser(user), org: publicOrg(org) })
})

router.get('/me', requireAuth, (req, res) => {
  const org = getData().organizations.find((o) => o.id === req.user.orgId) || null
  res.json({ user: publicUser(req.user), org: publicOrg(org) })
})

router.patch('/me', requireAuth, asyncHandler(async (req, res) => {
  const { name, email, phone } = req.body || {}
  if (name !== undefined && !String(name).trim()) return res.status(400).json({ error: "Ism bo'sh bo'lishi mumkin emas" })
  if (email !== undefined && email && !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: "Email manzil noto'g'ri" })
  }

  const user = await mutate((data) => {
    const item = data.users.find((u) => u.id === req.user.id)
    if (!item) throw Object.assign(new Error('Foydalanuvchi topilmadi'), { status: 404 })
    if (email && data.users.some((u) => u.id !== item.id && u.email.toLowerCase() === email.toLowerCase())) {
      throw Object.assign(new Error('Bu email band'), { status: 409 })
    }
    if (name !== undefined) item.name = name.trim()
    if (email !== undefined) item.email = email
    if (phone !== undefined) item.phone = phone
    return item
  })

  res.json(publicUser(user))
}))

router.post('/change-password', requireAuth, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  if (!currentPassword || !newPassword) return res.status(400).json({ error: "Joriy va yangi parolni kiriting" })
  if (String(newPassword).length < 6) return res.status(400).json({ error: "Yangi parol kamida 6 belgidan iborat bo'lishi kerak" })

  await mutate((data) => {
    const item = data.users.find((u) => u.id === req.user.id)
    if (!item || !bcrypt.compareSync(currentPassword, item.passwordHash)) {
      throw Object.assign(new Error("Joriy parol noto'g'ri"), { status: 401 })
    }
    item.passwordHash = bcrypt.hashSync(newPassword, 10)
    item.passwordChangedAt = new Date().toISOString()
    return item
  })

  res.json({ ok: true })
}))

router.get('/me/stats', requireAuth, (req, res) => {
  const data = getData()
  const txns = data.transactions.filter((t) => t.performedByUserId === req.user.id)
  const inCount = txns.filter((t) => t.type === 'in').length
  const outCount = txns.filter((t) => t.type === 'out').length
  const assignmentsCount = data.assignments.filter((a) => a.createdByUserId === req.user.id).length

  res.json({
    total: txns.length,
    in: inCount,
    out: outCount,
    assignments: assignmentsCount,
  })
})

export default router
