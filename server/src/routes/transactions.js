import { Router } from 'express'
import { getData, mutate } from '../db/lowdb.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { uid } from '../utils/codes.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { upload } from '../middleware/upload.js'
import { publicUser } from '../utils/serialize.js'

const router = Router()
router.use(requireAuth)

const KIRIM_STATUSES = ['completed', 'pending', 'partial'] // kirim holatlari

function enrich(data, t) {
  const product = data.products.find((p) => p.id === t.productId) || null
  return {
    ...t,
    supplier: t.supplier || product?.supplier || '',
    status: t.status || (t.type === 'in' ? 'completed' : t.status || null),
    product,
    employee: t.employeeId ? data.employees.find((e) => e.id === t.employeeId) || null : null,
    performedBy: publicUser(data.users.find((u) => u.id === t.performedByUserId) || null),
  }
}

router.get('/', (req, res) => {
  const { type, productId, employeeId, from, to } = req.query
  const data = getData()
  let items = data.transactions.filter((t) => t.orgId === req.orgId)
  if (type) items = items.filter((t) => t.type === type)
  if (productId) items = items.filter((t) => t.productId === productId)
  if (employeeId) items = items.filter((t) => t.employeeId === employeeId)
  if (from) items = items.filter((t) => t.createdAt >= from)
  if (to) items = items.filter((t) => t.createdAt <= to)
  items = items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  res.json(items.map((t) => enrich(data, t)))
})

router.post('/upload', requireRole('admin', 'manager'), upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fayl topilmadi' })
  res.status(201).json({
    url: `/uploads/${req.file.filename}`,
    name: req.file.originalname,
    size: req.file.size,
  })
})

router.post('/', requireRole('admin', 'manager'), asyncHandler(async (req, res) => {
  const { productId, type, quantity, employeeId, documentUrl, note, createdAt, supplier, status, reason } = req.body || {}
  if (!productId || !['in', 'out'].includes(type) || !quantity || Number(quantity) <= 0) {
    return res.status(400).json({ error: 'Mahsulot, tur va miqdor to\'g\'ri kiritilishi shart' })
  }

  const item = await mutate((data) => {
    const product = data.products.find((p) => p.id === productId && p.orgId === req.orgId)
    if (!product) throw Object.assign(new Error('Mahsulot topilmadi'), { status: 404 })
    const qty = Number(quantity)
    if (type === 'out' && product.quantity < qty) {
      throw Object.assign(new Error(`Omborda yetarli mahsulot yo'q (qoldiq: ${product.quantity})`), { status: 409 })
    }
    if (employeeId && !data.employees.some((e) => e.id === employeeId && e.orgId === req.orgId)) {
      throw Object.assign(new Error('Xodim topilmadi'), { status: 404 })
    }

    product.quantity += type === 'in' ? qty : -qty

    const row = {
      id: uid('txn'),
      orgId: req.orgId,
      productId,
      type,
      quantity: qty,
      employeeId: employeeId || null,
      performedByUserId: req.user.id,
      documentUrl: documentUrl || null,
      note: note || '',
      reason: type === 'out' ? reason || '' : '',
      supplier: supplier || (type === 'in' ? product.supplier || '' : ''),
      status: type === 'in' && KIRIM_STATUSES.includes(status) ? status : type === 'in' ? 'completed' : null,
      createdAt: createdAt || new Date().toISOString(),
    }
    data.transactions.unshift(row)

    if (product.quantity <= product.minStock) {
      data.notifications.unshift({
        id: uid('ntf'),
        orgId: req.orgId,
        userId: null,
        title: 'Mahsulot kam qoldi',
        body: `${product.name}: joriy qoldiq ${product.quantity} ${product.unit} (minimal: ${product.minStock})`,
        type: 'low_stock',
        read: false,
        createdAt: new Date().toISOString(),
      })
    }

    return row
  })

  res.status(201).json(enrich(getData(), item))
}))

router.patch('/:id', requireRole('admin', 'manager'), asyncHandler(async (req, res) => {
  const { quantity, note, supplier, documentUrl, status } = req.body || {}
  const item = await mutate((data) => {
    const row = data.transactions.find((t) => t.id === req.params.id && t.orgId === req.orgId)
    if (!row) throw Object.assign(new Error('Harakat topilmadi'), { status: 404 })
    if (row.type !== 'in') throw Object.assign(new Error("Faqat kirimni tahrirlash mumkin"), { status: 400 })

    if (quantity != null) {
      const qty = Number(quantity)
      if (!qty || qty <= 0) throw Object.assign(new Error('Miqdor noto\'g\'ri'), { status: 400 })
      const product = data.products.find((p) => p.id === row.productId && p.orgId === req.orgId)
      const delta = qty - row.quantity
      if (product) {
        if (delta < 0 && product.quantity < -delta) {
          throw Object.assign(new Error(`Qoldiq yetarli emas (joriy: ${product.quantity})`), { status: 409 })
        }
        product.quantity += delta
      }
      row.quantity = qty
    }
    if (note != null) row.note = note
    if (supplier != null) row.supplier = supplier
    if (documentUrl !== undefined) row.documentUrl = documentUrl
    if (status != null) {
      if (!KIRIM_STATUSES.includes(status)) throw Object.assign(new Error('Holat noto\'g\'ri'), { status: 400 })
      row.status = status
    }
    return row
  })
  res.json(enrich(getData(), item))
}))

router.delete('/:id', requireRole('admin', 'manager'), asyncHandler(async (req, res) => {
  await mutate((data) => {
    const idx = data.transactions.findIndex((t) => t.id === req.params.id && t.orgId === req.orgId)
    if (idx === -1) throw Object.assign(new Error('Harakat topilmadi'), { status: 404 })
    const row = data.transactions[idx]
    if (row.type !== 'in') throw Object.assign(new Error("Faqat kirimni o'chirish mumkin"), { status: 400 })
    const product = data.products.find((p) => p.id === row.productId && p.orgId === req.orgId)
    if (product) {
      if (product.quantity < row.quantity) {
        throw Object.assign(new Error(`Bu kirimni o'chirib bo'lmaydi: omborda yetarli qoldiq yo'q (qoldiq: ${product.quantity})`), { status: 409 })
      }
      product.quantity -= row.quantity
    }
    data.transactions.splice(idx, 1)
    return row
  })
  res.status(204).end()
}))

export default router
