import { Router } from 'express'
import { getData, mutate } from '../db/lowdb.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { generateAssetTag, generateQrToken, uid } from '../utils/codes.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()
router.use(requireAuth)

function normalizeNumber(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '')
}

function findRoom(data, orgId, roomId) {
  return (data.rooms || []).find((r) => r.id === roomId && r.orgId === orgId) || null
}

function findOrCreateRoom(data, orgId, { roomId, roomNumber, roomName, building, floor }) {
  if (roomId) {
    const room = findRoom(data, orgId, roomId)
    if (!room) throw Object.assign(new Error('Xona topilmadi'), { status: 404 })
    return room
  }
  const number = normalizeNumber(roomNumber)
  if (!number) throw Object.assign(new Error('Xona raqami kiritilishi shart'), { status: 400 })
  if (!Array.isArray(data.rooms)) data.rooms = []
  const exists = data.rooms.find(
    (r) => r.orgId === orgId && normalizeNumber(r.number).toLowerCase() === number.toLowerCase(),
  )
  if (exists) return exists
  const row = {
    id: uid('room'),
    orgId,
    number,
    name: String(roomName || '').trim() || `${number}-xona`,
    building: building ? String(building).trim() : null,
    floor: floor ? String(floor).trim() : null,
    createdAt: new Date().toISOString(),
  }
  data.rooms.push(row)
  return row
}

function relatedDoc(data, a) {
  if (a.documentUrl) {
    return {
      documentUrl: a.documentUrl,
      documentName: a.documentName || null,
      documentSize: a.documentSize || null,
    }
  }
  const txn = data.transactions.find(
    (t) =>
      t.orgId === a.orgId &&
      t.productId === a.productId &&
      t.type === 'out' &&
      t.documentUrl &&
      (t.reason === 'assign' || String(t.note || '').toLowerCase().includes('biriktir')) &&
      (a.roomId ? t.roomId === a.roomId : t.employeeId === a.employeeId),
  )
  if (!txn) {
    return { documentUrl: null, documentName: null, documentSize: null }
  }
  return {
    documentUrl: txn.documentUrl,
    documentName: txn.documentName || null,
    documentSize: txn.documentSize || null,
  }
}

function enrich(data, a) {
  const doc = relatedDoc(data, a)
  return {
    ...a,
    ...doc,
    product: data.products.find((p) => p.id === a.productId) || null,
    employee: a.employeeId ? data.employees.find((e) => e.id === a.employeeId) || null : null,
    room: a.roomId ? findRoom(data, a.orgId, a.roomId) : null,
  }
}

function myEmployeeId(req) {
  const emp = getData().employees.find((e) => e.userId === req.user.id && e.orgId === req.orgId)
  return emp?.id || null
}

router.get('/', (req, res) => {
  const { status, employeeId, productId, roomId } = req.query
  const data = getData()
  let items = data.assignments.filter((a) => a.orgId === req.orgId)
  if (req.user.role === 'employee') {
    const mine = myEmployeeId(req)
    items = items.filter((a) => a.employeeId === mine)
  } else {
    if (employeeId) items = items.filter((a) => a.employeeId === employeeId)
    if (roomId) items = items.filter((a) => a.roomId === roomId)
  }
  if (status) items = items.filter((a) => a.status === status)
  if (productId) items = items.filter((a) => a.productId === productId)
  items = items.sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt))
  res.json(items.map((a) => enrich(data, a)))
})

router.get('/:id', (req, res) => {
  const data = getData()
  const item = data.assignments.find((a) => a.id === req.params.id && a.orgId === req.orgId)
  if (!item) return res.status(404).json({ error: 'Biriktirma topilmadi' })
  if (req.user.role === 'employee' && item.employeeId !== myEmployeeId(req)) {
    return res.status(403).json({ error: 'Ruxsat yo\'q' })
  }
  res.json(enrich(data, item))
})

router.post('/', requireRole('admin', 'manager'), asyncHandler(async (req, res) => {
  const {
    productId,
    employeeId,
    roomId,
    roomNumber,
    roomName,
    building,
    floor,
    targetType,
    quantity,
    note,
    documentUrl,
    documentName,
    documentSize,
    assignedAt,
    reason,
  } = req.body || {}

  const kind = targetType === 'room' || roomId || roomNumber ? 'room' : 'employee'
  if (!productId) return res.status(400).json({ error: 'Mahsulot tanlanishi shart' })
  if (kind === 'employee' && !employeeId) {
    return res.status(400).json({ error: 'Mahsulot va xodim tanlanishi shart' })
  }
  if (kind === 'room' && !roomId && !normalizeNumber(roomNumber)) {
    return res.status(400).json({ error: 'Mahsulot va xona tanlanishi shart' })
  }

  const qty = Number(quantity) || 1

  const item = await mutate((data) => {
    const product = data.products.find((p) => p.id === productId && p.orgId === req.orgId)
    if (!product) throw Object.assign(new Error('Mahsulot topilmadi'), { status: 404 })
    if (product.quantity < qty) {
      throw Object.assign(new Error(`Omborda yetarli mahsulot yo'q (qoldiq: ${product.quantity})`), { status: 409 })
    }

    let employee = null
    let room = null
    if (kind === 'employee') {
      employee = data.employees.find((e) => e.id === employeeId && e.orgId === req.orgId)
      if (!employee) throw Object.assign(new Error('Xodim topilmadi'), { status: 404 })
    } else {
      room = findOrCreateRoom(data, req.orgId, { roomId, roomNumber, roomName, building, floor })
    }

    const at = assignedAt || new Date().toISOString()
    product.quantity -= qty
    data.transactions.unshift({
      id: uid('txn'),
      orgId: req.orgId,
      productId,
      type: 'out',
      quantity: qty,
      employeeId: employee?.id || null,
      roomId: room?.id || null,
      performedByUserId: req.user.id,
      documentUrl: documentUrl || null,
      documentName: documentName || null,
      documentSize: documentSize != null ? Number(documentSize) : null,
      note: note || (room ? `${room.number}-xonaga biriktirish` : 'Xodimga biriktirish'),
      reason: reason || 'assign',
      createdAt: at,
    })

    let qrToken
    do {
      qrToken = generateQrToken()
    } while (data.assignments.some((a) => a.qrToken === qrToken))
    const assetTag = generateAssetTag(data.assignments.length + 1)
    const now = new Date().toISOString()

    const row = {
      id: uid('asg'),
      orgId: req.orgId,
      productId,
      employeeId: employee?.id || null,
      roomId: room?.id || null,
      targetType: kind,
      quantity: qty,
      qrToken,
      assetTag,
      createdByUserId: req.user.id,
      status: kind === 'room' ? 'active' : 'pending',
      assignedAt: at,
      confirmedAt: kind === 'room' ? at : null,
      confirmMethod: kind === 'room' ? 'room' : null,
      confirmedByUserId: kind === 'room' ? req.user.id : null,
      returnedAt: null,
      documentUrl: documentUrl || null,
      documentName: documentName || null,
      documentSize: documentSize != null ? Number(documentSize) : null,
    }
    data.assignments.push(row)

    if (employee?.userId) {
      data.notifications.unshift({
        id: uid('ntf'),
        orgId: req.orgId,
        userId: employee.userId,
        title: 'Sizga buyum biriktirildi',
        body: `${product.name} (${qty} ${product.unit}) sizga biriktirildi. Qabul qilganingizni tasdiqlang.`,
        type: 'assignment',
        read: false,
        createdAt: now,
      })
    }

    return row
  })

  res.status(201).json(enrich(getData(), item))
}))

router.patch('/:id', requireRole('admin', 'manager'), asyncHandler(async (req, res) => {
  const { documentUrl, documentName, documentSize } = req.body || {}
  const item = await mutate((data) => {
    const row = data.assignments.find((a) => a.id === req.params.id && a.orgId === req.orgId)
    if (!row) throw Object.assign(new Error('Biriktirma topilmadi'), { status: 404 })
    if (documentUrl !== undefined) row.documentUrl = documentUrl
    if (documentName !== undefined) row.documentName = documentName
    if (documentSize !== undefined) row.documentSize = documentSize == null ? null : Number(documentSize)
    return row
  })
  res.json(enrich(getData(), item))
}))

router.post('/:id/confirm', asyncHandler(async (req, res) => {
  const isStaff = ['admin', 'manager'].includes(req.user.role)
  const item = await mutate((data) => {
    const row = data.assignments.find((a) => a.id === req.params.id && a.orgId === req.orgId)
    if (!row) throw Object.assign(new Error('Biriktirma topilmadi'), { status: 404 })
    if (row.status !== 'pending') throw Object.assign(new Error('Bu buyum allaqachon tasdiqlangan yoki qaytarilgan'), { status: 409 })

    const employee = data.employees.find((e) => e.id === row.employeeId)
    const isOwner = employee?.userId === req.user.id
    if (!isOwner && !isStaff) throw Object.assign(new Error('Ruxsat yo\'q'), { status: 403 })

    row.status = 'active'
    row.confirmedAt = new Date().toISOString()
    row.confirmMethod = isOwner ? 'self' : 'witness'
    row.confirmedByUserId = req.user.id
    return row
  })
  res.json(enrich(getData(), item))
}))

router.post('/:id/return', requireRole('admin', 'manager'), asyncHandler(async (req, res) => {
  const item = await mutate((data) => {
    const row = data.assignments.find((a) => a.id === req.params.id && a.orgId === req.orgId)
    if (!row) throw Object.assign(new Error('Biriktirma topilmadi'), { status: 404 })
    if (row.status === 'returned') throw Object.assign(new Error('Bu buyum allaqachon qaytarilgan'), { status: 409 })
    const product = data.products.find((p) => p.id === row.productId)
    if (product) product.quantity += row.quantity
    const room = row.roomId ? findRoom(data, req.orgId, row.roomId) : null

    data.transactions.unshift({
      id: uid('txn'),
      orgId: req.orgId,
      productId: row.productId,
      type: 'in',
      quantity: row.quantity,
      employeeId: row.employeeId || null,
      roomId: row.roomId || null,
      performedByUserId: req.user.id,
      documentUrl: null,
      note: room ? `${room.number}-xonadan qaytarildi` : 'Xodimdan qaytarildi',
      createdAt: new Date().toISOString(),
    })

    row.status = 'returned'
    row.returnedAt = new Date().toISOString()
    return row
  })
  res.json(enrich(getData(), item))
}))

export default router
