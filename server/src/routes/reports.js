import { Router } from 'express'
import { getData } from '../db/lowdb.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth, requireRole('super_admin', 'admin', 'manager'))

function rangeFromPeriod(period) {
  const now = new Date()
  const to = now.toISOString()
  const start = new Date(now)
  if (period === 'daily') start.setHours(0, 0, 0, 0)
  else if (period === 'weekly') start.setDate(start.getDate() - 7)
  else if (period === 'yearly') start.setMonth(0, 1), start.setHours(0, 0, 0, 0)
  else start.setDate(start.getDate() - 30) // monthly (default)
  return { from: start.toISOString(), to }
}

router.get('/summary', (req, res) => {
  const data = getData()
  const period = req.query.period || 'monthly'
  const { from, to } = req.query.from && req.query.to ? { from: req.query.from, to: req.query.to } : rangeFromPeriod(period)

  const txns = data.transactions.filter((t) => t.orgId === req.orgId && t.createdAt >= from && t.createdAt <= to)

  const priceOf = (productId) => data.products.find((p) => p.id === productId)?.price || 0

  const totals = txns.reduce(
    (acc, t) => {
      const sum = t.quantity * priceOf(t.productId)
      if (t.type === 'in') {
        acc.inCount++
        acc.inQty += t.quantity
        acc.inSum += sum
      } else {
        acc.outCount++
        acc.outQty += t.quantity
        acc.outSum += sum
      }
      return acc
    },
    { inCount: 0, outCount: 0, inQty: 0, outQty: 0, inSum: 0, outSum: 0 },
  )

  const byProductMap = new Map()
  txns.forEach((t) => {
    const product = data.products.find((p) => p.id === t.productId)
    if (!product) return
    const row = byProductMap.get(product.id) || {
      productId: product.id,
      name: product.name,
      unit: product.unit,
      inQty: 0,
      outQty: 0,
      inSum: 0,
      outSum: 0,
    }
    const sum = t.quantity * product.price
    if (t.type === 'in') {
      row.inQty += t.quantity
      row.inSum += sum
    } else {
      row.outQty += t.quantity
      row.outSum += sum
    }
    byProductMap.set(product.id, row)
  })

  const byEmployeeMap = new Map()
  txns
    .filter((t) => t.type === 'out' && t.employeeId)
    .forEach((t) => {
      const employee = data.employees.find((e) => e.id === t.employeeId)
      if (!employee) return
      const row = byEmployeeMap.get(employee.id) || {
        employeeId: employee.id,
        fullName: employee.fullName,
        department: employee.department,
        outQty: 0,
        outSum: 0,
        items: 0,
      }
      row.outQty += t.quantity
      row.outSum += t.quantity * (data.products.find((p) => p.id === t.productId)?.price || 0)
      row.items += 1
      byEmployeeMap.set(employee.id, row)
    })

  const byDayMap = new Map()
  const cursor = new Date(from)
  const end = new Date(to)
  // seed every day in range with zero so the trend chart stays continuous even when sparse
  for (let d = new Date(cursor); d <= end && byDayMap.size < 370; d.setDate(d.getDate() + 1)) {
    const day = d.toISOString().slice(0, 10)
    byDayMap.set(day, { date: day, inQty: 0, outQty: 0, inSum: 0, outSum: 0 })
  }
  txns.forEach((t) => {
    const day = t.createdAt.slice(0, 10)
    const row = byDayMap.get(day) || { date: day, inQty: 0, outQty: 0, inSum: 0, outSum: 0 }
    const sum = t.quantity * priceOf(t.productId)
    if (t.type === 'in') {
      row.inQty += t.quantity
      row.inSum += sum
    } else {
      row.outQty += t.quantity
      row.outSum += sum
    }
    byDayMap.set(day, row)
  })

  res.json({
    range: { from, to },
    totals,
    byProduct: [...byProductMap.values()].sort((a, b) => b.outQty + b.inQty - (a.outQty + a.inQty)),
    byEmployee: [...byEmployeeMap.values()].sort((a, b) => b.outSum - a.outSum),
    byDay: [...byDayMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
  })
})

router.get('/low-stock', (req, res) => {
  const data = getData()
  const items = data.products
    .filter((p) => p.orgId === req.orgId && p.quantity <= p.minStock)
    .sort((a, b) => a.quantity - a.minStock - (b.quantity - b.minStock))
  res.json(items)
})

router.get('/employee/:id', (req, res) => {
  const data = getData()
  const employee = data.employees.find((e) => e.id === req.params.id && e.orgId === req.orgId)
  if (!employee) return res.status(404).json({ error: 'Xodim topilmadi' })

  const assignments = data.assignments
    .filter((a) => a.employeeId === employee.id)
    .map((a) => ({ ...a, product: data.products.find((p) => p.id === a.productId) || null }))
    .sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt))

  const transactions = data.transactions
    .filter((t) => t.employeeId === employee.id)
    .map((t) => ({ ...t, product: data.products.find((p) => p.id === t.productId) || null }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const totalOutSum = transactions
    .filter((t) => t.type === 'out')
    .reduce((s, t) => s + t.quantity * (t.product?.price || 0), 0)

  res.json({ employee, assignments, transactions, totalOutSum })
})

export default router
