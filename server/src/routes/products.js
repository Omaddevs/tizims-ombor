import { Router } from 'express'
import { getData, mutate } from '../db/lowdb.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { generateProductBarcode, uid } from '../utils/codes.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()
router.use(requireAuth)

router.get('/', (req, res) => {
  const { search, categoryId, lowStock } = req.query
  let items = getData().products.filter((p) => p.orgId === req.orgId)
  if (categoryId) items = items.filter((p) => p.categoryId === categoryId)
  if (search) {
    const q = String(search).toLowerCase()
    items = items.filter((p) => p.name.toLowerCase().includes(q) || p.barcode.includes(q))
  }
  if (lowStock === '1' || lowStock === 'true') items = items.filter((p) => p.quantity <= p.minStock)
  res.json(items.sort((a, b) => a.name.localeCompare(b.name)))
})

router.post('/import', requireRole('admin', 'manager'), asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : []
  if (!items.length) return res.status(400).json({ error: "Import qilinadigan qatorlar yo'q" })
  if (items.length > 500) return res.status(400).json({ error: "Bir martada 500 tadan ortiq mahsulot import qilib bo'lmaydi" })

  const result = await mutate((data) => {
    const created = []
    const errors = []
    items.forEach((raw, idx) => {
      const name = String(raw?.name || '').trim()
      const unit = String(raw?.unit || '').trim()
      if (!name || !unit) {
        errors.push({ row: idx + 2, error: "Nomi va o'lchov birligi shart" })
        return
      }
      let categoryId = raw.categoryId || null
      if (!categoryId && raw.category) {
        const cat = data.categories.find(
          (c) => c.orgId === req.orgId && c.name.toLowerCase() === String(raw.category).trim().toLowerCase(),
        )
        categoryId = cat?.id || null
      }
      const code = String(raw.barcode || '').trim() || generateProductBarcode()
      if (data.products.some((p) => p.orgId === req.orgId && p.barcode === code)) {
        errors.push({ row: idx + 2, error: `Shtrix-kod band: ${code}` })
        return
      }
      const row = {
        id: uid('prod'),
        orgId: req.orgId,
        categoryId,
        name,
        unit,
        barcode: code,
        quantity: Number(raw.quantity) || 0,
        minStock: Number(raw.minStock) || 0,
        price: Number(raw.price) || 0,
        supplier: raw.supplier || '',
        photoUrl: null,
        createdAt: new Date().toISOString(),
      }
      data.products.push(row)
      created.push(row)
    })
    return { created: created.length, errors }
  })
  res.json(result)
}))

router.get('/:id', (req, res) => {
  const item = getData().products.find((p) => p.id === req.params.id && p.orgId === req.orgId)
  if (!item) return res.status(404).json({ error: 'Mahsulot topilmadi' })
  res.json(item)
})

router.post('/', requireRole('admin', 'manager'), asyncHandler(async (req, res) => {
  const { name, categoryId, unit, barcode, quantity, minStock, price, supplier, photoUrl } = req.body || {}
  if (!name || !unit) return res.status(400).json({ error: 'Nomi va o\'lchov birligi kiritilishi shart' })

  const item = await mutate((data) => {
    const code = barcode?.trim() || generateProductBarcode()
    if (data.products.some((p) => p.orgId === req.orgId && p.barcode === code)) {
      throw Object.assign(new Error('Bu shtrix-kod allaqachon mavjud'), { status: 409 })
    }
    const row = {
      id: uid('prod'),
      orgId: req.orgId,
      categoryId: categoryId || null,
      name,
      unit,
      barcode: code,
      quantity: Number(quantity) || 0,
      minStock: Number(minStock) || 0,
      price: Number(price) || 0,
      supplier: supplier || '',
      photoUrl: photoUrl || null,
      createdAt: new Date().toISOString(),
    }
    data.products.push(row)
    return row
  })
  res.status(201).json(item)
}))

router.patch('/:id', requireRole('admin', 'manager'), asyncHandler(async (req, res) => {
  const fields = ['name', 'categoryId', 'unit', 'minStock', 'price', 'supplier', 'photoUrl']
  const item = await mutate((data) => {
    const row = data.products.find((p) => p.id === req.params.id && p.orgId === req.orgId)
    if (!row) throw Object.assign(new Error('Mahsulot topilmadi'), { status: 404 })
    fields.forEach((f) => {
      if (req.body?.[f] !== undefined) row[f] = f === 'minStock' || f === 'price' ? Number(req.body[f]) : req.body[f]
    })
    if (req.body?.barcode && req.body.barcode !== row.barcode) {
      if (data.products.some((p) => p.orgId === req.orgId && p.barcode === req.body.barcode && p.id !== row.id)) {
        throw Object.assign(new Error('Bu shtrix-kod allaqachon mavjud'), { status: 409 })
      }
      row.barcode = req.body.barcode
    }
    return row
  })
  res.json(item)
}))

router.delete('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  await mutate((data) => {
    const used = data.transactions.some((t) => t.productId === req.params.id && t.orgId === req.orgId)
    if (used) throw Object.assign(new Error('Bu mahsulot bo\'yicha harakatlar mavjud, o\'chirib bo\'lmaydi'), { status: 409 })
    data.products = data.products.filter((p) => !(p.id === req.params.id && p.orgId === req.orgId))
  })
  res.status(204).end()
}))

export default router
