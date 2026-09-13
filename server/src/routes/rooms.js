import { Router } from 'express'
import { getData, mutate } from '../db/lowdb.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { uid } from '../utils/codes.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()
router.use(requireAuth)

function normalizeNumber(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '')
}

function enrich(data, room) {
  const active = data.assignments.filter(
    (a) => a.orgId === room.orgId && a.roomId === room.id && a.status !== 'returned',
  ).length
  return { ...room, activeAssignments: active }
}

router.get('/', (req, res) => {
  const rooms = (getData().rooms || [])
    .filter((r) => r.orgId === req.orgId)
    .sort((a, b) => String(a.number).localeCompare(String(b.number), 'uz', { numeric: true }))
  const data = getData()
  res.json(rooms.map((r) => enrich(data, r)))
})

router.post('/', requireRole('admin', 'manager'), asyncHandler(async (req, res) => {
  const number = normalizeNumber(req.body?.number)
  if (!number) return res.status(400).json({ error: 'Xona raqami kiritilishi shart' })
  const name = String(req.body?.name || '').trim() || `${number}-xona`
  const building = String(req.body?.building || '').trim()
  const floor = String(req.body?.floor || '').trim()

  const item = await mutate((data) => {
    if (!Array.isArray(data.rooms)) data.rooms = []
    const exists = data.rooms.find(
      (r) => r.orgId === req.orgId && normalizeNumber(r.number).toLowerCase() === number.toLowerCase(),
    )
    if (exists) return exists
    const row = {
      id: uid('room'),
      orgId: req.orgId,
      number,
      name,
      building: building || null,
      floor: floor || null,
      createdAt: new Date().toISOString(),
    }
    data.rooms.push(row)
    return row
  })

  res.status(201).json(enrich(getData(), item))
}))

export default router
