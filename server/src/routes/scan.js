import { Router } from 'express'
import { getData } from '../db/lowdb.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

function roomOf(data, assignment) {
  if (!assignment?.roomId) return null
  return (data.rooms || []).find((r) => r.id === assignment.roomId) || null
}

function withPeople(data, assignment) {
  return {
    ...assignment,
    employee: assignment.employeeId ? data.employees.find((e) => e.id === assignment.employeeId) || null : null,
    room: roomOf(data, assignment),
  }
}

router.get('/:code', (req, res) => {
  const data = getData()
  const code = req.params.code.trim()
  const orgId = req.orgId

  const assignment = data.assignments.find((a) => a.qrToken === code && a.orgId === orgId)
  if (assignment) {
    return res.json({
      kind: 'assignment',
      assignment,
      product: data.products.find((p) => p.id === assignment.productId) || null,
      employee: assignment.employeeId ? data.employees.find((e) => e.id === assignment.employeeId) || null : null,
      room: roomOf(data, assignment),
    })
  }

  const product = data.products.find((p) => p.barcode === code && p.orgId === orgId)
  if (product) {
    const activeAssignments = data.assignments
      .filter((a) => a.productId === product.id && a.status !== 'returned')
      .map((a) => withPeople(data, a))
    return res.json({ kind: 'product', product, activeAssignments })
  }

  const employee = data.employees.find((e) => e.badgeCode === code && e.orgId === orgId)
  if (employee) {
    const activeAssignments = data.assignments
      .filter((a) => a.employeeId === employee.id && a.status !== 'returned')
      .map((a) => ({ ...a, product: data.products.find((p) => p.id === a.productId) || null }))
    return res.json({ kind: 'employee', employee, activeAssignments })
  }

  const room = (data.rooms || []).find(
    (r) => r.orgId === orgId && String(r.number).toLowerCase() === code.toLowerCase(),
  )
  if (room) {
    const activeAssignments = data.assignments
      .filter((a) => a.roomId === room.id && a.status !== 'returned')
      .map((a) => ({ ...a, product: data.products.find((p) => p.id === a.productId) || null }))
    return res.json({ kind: 'room', room, activeAssignments })
  }

  res.status(404).json({ error: 'Kod bo\'yicha hech narsa topilmadi' })
})

export default router
