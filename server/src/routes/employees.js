import { Router } from 'express'
import { getData, mutate } from '../db/lowdb.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { generateBadgeCode, uid } from '../utils/codes.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()
router.use(requireAuth)

const STATUSES = ['active', 'on_leave', 'terminated']

function normalizeEmployee(e, data) {
  return {
    ...e,
    status: STATUSES.includes(e.status) ? e.status : 'active',
    hiredAt: e.hiredAt || e.createdAt,
    phone: e.phone || '',
    position: e.position || '',
    photoUrl: e.photoUrl || null,
    activeAssignments: data.assignments.filter((a) => a.employeeId === e.id && a.status !== 'returned').length,
  }
}

function withCounts(data, orgId) {
  return data.employees.filter((e) => e.orgId === orgId).map((e) => normalizeEmployee(e, data))
}

router.get('/', (req, res) => {
  res.json(withCounts(getData(), req.orgId).sort((a, b) => a.fullName.localeCompare(b.fullName)))
})

router.get('/:id', (req, res) => {
  const data = getData()
  const item = data.employees.find((e) => e.id === req.params.id && e.orgId === req.orgId)
  if (!item) return res.status(404).json({ error: 'Xodim topilmadi' })
  res.json(normalizeEmployee(item, data))
})

router.get('/:id/history', (req, res) => {
  const data = getData()
  const employee = data.employees.find((e) => e.id === req.params.id && e.orgId === req.orgId)
  if (!employee) return res.status(404).json({ error: 'Xodim topilmadi' })

  const assignments = data.assignments
    .filter((a) => a.employeeId === employee.id && a.orgId === req.orgId)
    .map((a) => ({ ...a, product: data.products.find((p) => p.id === a.productId) || null }))
    .sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt))

  const transactions = data.transactions
    .filter((t) => t.employeeId === employee.id && t.orgId === req.orgId)
    .map((t) => ({ ...t, product: data.products.find((p) => p.id === t.productId) || null }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  res.json({ employee: normalizeEmployee(employee, data), assignments, transactions })
})

router.post('/', requireRole('admin', 'manager'), asyncHandler(async (req, res) => {
  const { fullName, department, position, phone, photoUrl, userId, status, hiredAt } = req.body || {}
  if (!fullName || !department) return res.status(400).json({ error: 'F.I.Sh. va bo\'lim kiritilishi shart' })

  const item = await mutate((data) => {
    let badgeCode
    do {
      badgeCode = generateBadgeCode()
    } while (data.employees.some((e) => e.badgeCode === badgeCode))
    const now = new Date().toISOString()
    const row = {
      id: uid('emp'),
      orgId: req.orgId,
      userId: userId || null,
      fullName,
      department,
      position: position || '',
      phone: phone || '',
      badgeCode,
      photoUrl: photoUrl || null,
      status: STATUSES.includes(status) ? status : 'active',
      hiredAt: hiredAt || now,
      createdAt: now,
    }
    data.employees.push(row)
    return row
  })
  res.status(201).json(item)
}))

router.patch('/:id', requireRole('admin', 'manager'), asyncHandler(async (req, res) => {
  const fields = ['fullName', 'department', 'position', 'phone', 'photoUrl', 'userId', 'status', 'hiredAt']
  const item = await mutate((data) => {
    const row = data.employees.find((e) => e.id === req.params.id && e.orgId === req.orgId)
    if (!row) throw Object.assign(new Error('Xodim topilmadi'), { status: 404 })
    fields.forEach((f) => {
      if (req.body?.[f] === undefined) return
      if (f === 'status' && !STATUSES.includes(req.body[f])) return
      row[f] = req.body[f]
    })
    return row
  })
  res.json(item)
}))

router.delete('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  await mutate((data) => {
    const hasActive = data.assignments.some((a) => a.employeeId === req.params.id && a.status !== 'returned')
    if (hasActive) throw Object.assign(new Error('Xodimda faol biriktirilgan buyumlar bor'), { status: 409 })
    data.employees = data.employees.filter((e) => !(e.id === req.params.id && e.orgId === req.orgId))
  })
  res.status(204).end()
}))

export default router
