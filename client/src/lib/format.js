export const EMPLOYEE_STATUS = {
  active: { id: 'active', label: 'Faol', tone: 'green' },
  on_leave: { id: 'on_leave', label: "Ta'tilda", tone: 'yellow' },
  terminated: { id: 'terminated', label: "Ishdan bo'shagan", tone: 'red' },
}

export const EMPLOYEE_STATUS_IDS = Object.keys(EMPLOYEE_STATUS)

export function employeeStatus(emp) {
  return EMPLOYEE_STATUS[emp?.status] || EMPLOYEE_STATUS.active
}

export const ROLE_LABEL = {
  super_admin: 'Tizim egasi',
  admin: 'Ombor mudiri',
  manager: 'Menejer',
  employee: 'Xodim',
}

export const PERIOD_LABEL = {
  daily: 'Kunlik',
  weekly: 'Haftalik',
  monthly: 'Oylik',
  yearly: 'Yillik',
}

export const CHIQUM_REASONS = [
  { value: 'sale', label: 'Sotuv', hint: 'Mijozga sotilgan mahsulot' },
  { value: 'internal', label: 'Ichki ehtiyoj', hint: "Ofis, xizmat ko'rsatish va h.k." },
  { value: 'gift', label: 'Hadya / Promo', hint: "Reklama yoki sovg'a" },
  { value: 'damaged', label: 'Nosoz / Buzilgan', hint: 'Yaroqsiz mahsulotlar' },
  { value: 'other', label: 'Boshqa', hint: 'Boshqa sabab' },
  { value: 'assign', label: 'Xodimga biriktirish', hint: 'Asosiy vosita sifatida' },
]

export function reasonLabel(id, fallback = 'Boshqa') {
  if (!id) return fallback
  return CHIQUM_REASONS.find((r) => r.value === id)?.label || fallback
}

export function formatSum(value) {
  const n = Number(value) || 0
  return `${n.toLocaleString('ru-RU')} so'm`
}

export function formatDate(iso, withTime = false) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const pad = (n) => String(n).padStart(2, '0')
  const date = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
  if (!withTime) return date
  return `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'hozir'
  if (mins < 60) return `${mins} daqiqa oldin`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} soat oldin`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} kun oldin`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks} hafta oldin`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} oy oldin`
  const years = Math.floor(months / 12)
  return `${years} yil oldin`
}
