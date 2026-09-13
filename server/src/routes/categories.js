import { Router } from 'express'
import { getData, mutate } from '../db/lowdb.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { uid } from '../utils/codes.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()
router.use(requireAuth)

router.get('/', (req, res) => {
  res.json(getData().categories.filter((c) => c.orgId === req.orgId))
})

router.post('/', requireRole('admin', 'manager'), asyncHandler(async (req, res) => {
  const { name, icon, description } = req.body || {}
  if (!name) return res.status(400).json({ error: 'Nom kiritilishi shart' })
  const item = await mutate((data) => {
    const row = {
      id: uid('cat'),
      orgId: req.orgId,
      name: String(name).trim(),
      icon: icon || 'package',
      description: String(description || '').trim(),
      archived: false,
    }
    data.categories.push(row)
    return row
  })
  res.status(201).json(item)
}))

router.patch('/:id', requireRole('admin', 'manager'), asyncHandler(async (req, res) => {
  const item = await mutate((data) => {
    const row = data.categories.find((c) => c.id === req.params.id && c.orgId === req.orgId)
    if (!row) throw Object.assign(new Error('Kategoriya topilmadi'), { status: 404 })
    if (req.body?.name !== undefined) row.name = String(req.body.name).trim()
    if (req.body?.icon !== undefined) row.icon = req.body.icon
    if (req.body?.description !== undefined) row.description = String(req.body.description || '').trim()
    if (req.body?.archived !== undefined) row.archived = Boolean(req.body.archived)
    return row
  })
  res.json(item)
}))

router.delete('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  await mutate((data) => {
    const inUse = data.products.some((p) => p.categoryId === req.params.id && p.orgId === req.orgId)
    if (inUse) throw Object.assign(new Error('Kategoriyada mahsulotlar mavjud, avval ularni o\'chiring'), { status: 409 })
    data.categories = data.categories.filter((c) => !(c.id === req.params.id && c.orgId === req.orgId))
  })
  res.status(204).end()
}))

export default router
