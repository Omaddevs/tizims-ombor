import { Router } from 'express'
import { getData, mutate } from '../db/lowdb.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()
router.use(requireAuth)

router.get('/', (req, res) => {
  const items = getData()
    .notifications.filter((n) => n.orgId === req.orgId && (n.userId === req.user.id || (n.userId === null && ['admin', 'manager'].includes(req.user.role))))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  res.json(items)
})

router.patch('/:id/read', asyncHandler(async (req, res) => {
  await mutate((data) => {
    const row = data.notifications.find((n) => n.id === req.params.id && n.orgId === req.orgId)
    if (row) row.read = true
  })
  res.status(204).end()
}))

router.post('/read-all', asyncHandler(async (req, res) => {
  await mutate((data) => {
    data.notifications
      .filter((n) => n.orgId === req.orgId && (n.userId === req.user.id || n.userId === null))
      .forEach((n) => (n.read = true))
  })
  res.status(204).end()
}))

export default router
