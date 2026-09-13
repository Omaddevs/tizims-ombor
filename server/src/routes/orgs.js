import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { getData, mutate } from '../db/lowdb.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { publicUser } from '../utils/serialize.js'
import { uid } from '../utils/codes.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.use(requireAuth, requireRole('super_admin'))

router.get('/', (_req, res) => {
  const data = getData()
  const orgs = data.organizations.map((org) => ({
    ...org,
    productsCount: data.products.filter((p) => p.orgId === org.id).length,
    employeesCount: data.employees.filter((e) => e.orgId === org.id).length,
    usersCount: data.users.filter((u) => u.orgId === org.id).length,
  }))
  res.json(orgs)
})

router.post('/', asyncHandler(async (req, res) => {
  const { name, slug, brandColor, adminName, adminUsername, adminPassword } = req.body || {}
  if (!name || !slug) return res.status(400).json({ error: 'Tashkilot nomi va slug kiritilishi shart' })
  if (!adminName || !adminUsername || !adminPassword) {
    return res.status(400).json({ error: 'Tashkilot admini ma\'lumotlari to\'liq emas' })
  }

  const result = await mutate((data) => {
    if (data.organizations.some((o) => o.slug === slug)) {
      throw Object.assign(new Error('Bu slug band'), { status: 409 })
    }
    const org = { id: uid('org'), name, slug, brandColor: brandColor || '#1d4ed8', createdAt: new Date().toISOString() }
    const admin = {
      id: uid('usr'),
      orgId: org.id,
      name: adminName,
      username: adminUsername,
      email: `${adminUsername}@${slug}.uz`,
      passwordHash: bcrypt.hashSync(adminPassword, 10),
      role: 'admin',
      phone: '',
      avatarColor: '#1d4ed8',
      blocked: false,
      createdAt: new Date().toISOString(),
    }
    data.organizations.push(org)
    data.users.push(admin)
    return { org, admin }
  })

  res.status(201).json({ org: result.org, admin: publicUser(result.admin) })
}))

export default router
