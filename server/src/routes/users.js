import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { getData, mutate } from '../db/lowdb.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { publicUser } from '../utils/serialize.js'
import { uid } from '../utils/codes.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.use(requireAuth, requireRole('super_admin', 'admin'))

router.get('/', (req, res) => {
  if (!req.orgId) return res.status(400).json({ error: 'Tashkilot tanlanmagan' })
  res.json(getData().users.filter((u) => u.orgId === req.orgId).map(publicUser))
})

router.post('/', asyncHandler(async (req, res) => {
  const orgId = req.orgId
  if (!orgId) return res.status(400).json({ error: 'Tashkilot tanlanmagan' })
  const { name, username, email, password, role, phone } = req.body || {}
  if (!name || !username || !password) return res.status(400).json({ error: 'Ism, login va parol kiritilishi shart' })
  const safeRole = ['admin', 'manager', 'employee'].includes(role) ? role : 'employee'

  const user = await mutate((data) => {
    if (data.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      throw Object.assign(new Error('Bu login band'), { status: 409 })
    }
    const item = {
      id: uid('usr'),
      orgId,
      name,
      username,
      email: email || `${username}@${orgId}.local`,
      passwordHash: bcrypt.hashSync(password, 10),
      role: safeRole,
      phone: phone || '',
      avatarColor: '#1d4ed8',
      blocked: false,
      createdAt: new Date().toISOString(),
    }
    data.users.push(item)
    return item
  })

  res.status(201).json(publicUser(user))
}))

router.patch('/:id', asyncHandler(async (req, res) => {
  const { name, phone, role, blocked, password } = req.body || {}
  const user = await mutate((data) => {
    const item = data.users.find((u) => u.id === req.params.id && u.orgId === req.orgId)
    if (!item) throw Object.assign(new Error('Foydalanuvchi topilmadi'), { status: 404 })
    if (name !== undefined) item.name = name
    if (phone !== undefined) item.phone = phone
    if (role !== undefined && ['admin', 'manager', 'employee'].includes(role)) item.role = role
    if (blocked !== undefined) item.blocked = Boolean(blocked)
    if (password) item.passwordHash = bcrypt.hashSync(password, 10)
    return item
  })
  res.json(publicUser(user))
}))

router.delete('/:id', asyncHandler(async (req, res) => {
  await mutate((data) => {
    const item = data.users.find((u) => u.id === req.params.id && u.orgId === req.orgId)
    if (!item) throw Object.assign(new Error('Foydalanuvchi topilmadi'), { status: 404 })
    if (item.id === req.user.id) throw Object.assign(new Error("O'zingizni o'chira olmaysiz"), { status: 400 })
    if (item.role === 'admin') {
      const otherAdmins = data.users.some((u) => u.orgId === req.orgId && u.role === 'admin' && u.id !== item.id)
      if (!otherAdmins) throw Object.assign(new Error("Tashkilotda kamida bitta ombor mudiri bo'lishi kerak"), { status: 409 })
    }
    data.users = data.users.filter((u) => !(u.id === req.params.id && u.orgId === req.orgId))
  })
  res.status(204).end()
}))

export default router
