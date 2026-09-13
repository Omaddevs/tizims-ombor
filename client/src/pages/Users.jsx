import { useEffect, useMemo, useRef, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import {
  Ban,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users as UsersIcon,
} from 'lucide-react'
import { useCreateUser, useDeleteUser, useEmployees, useOrgUsers, useUpdateUser } from '../api/queries'
import { useCurrentUser } from '../store/useAuthStore'
import {
  Avatar,
  Badge,
  EmptyState,
  ErrorNote,
  Field,
  KpiCard,
  Modal,
  PageHeader,
  PrimaryBtn,
  SecondaryBtn,
  cn,
  inputClass,
  searchWrapClass,
} from '../components/ui'
import { Select } from '../components/Select'
import { ROLE_LABEL, formatDate } from '../lib/format'
import { exportRowsToExcel } from '../lib/excel'

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Ombor mudiri' },
  { value: 'manager', label: 'Menejer' },
  { value: 'employee', label: 'Xodim' },
]

const ROLE_FILTER_OPTIONS = [{ value: '', label: 'Barcha rollar' }, ...ROLE_OPTIONS]

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Barcha holatlar' },
  { value: 'active', label: 'Faol' },
  { value: 'blocked', label: 'Bloklangan' },
]

const PAGE_SIZES = [
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
]

const ROLE_COLOR = { admin: '#3b6cf5', manager: '#8b5cf6', employee: '#c4b5fd' }
const AVATAR_COLORS = ['#3b6cf5', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e', '#0ea5e9', '#64748b']

function colorFor(name = '') {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function inMonth(iso, d) {
  const x = new Date(iso)
  return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth()
}

function formatDelta(curr, prev) {
  if (!curr && !prev) return ''
  if (!prev) return curr ? `+${curr}` : ''
  const pct = Math.round(((curr - prev) / prev) * 100)
  if (!pct) return '0%'
  return `${pct > 0 ? '+' : ''}${pct}%`
}

function visiblePages(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  if (page <= 4) return [1, 2, 3, 4, 5, '…', pages]
  if (page >= pages - 3) return [1, '…', pages - 4, pages - 3, pages - 2, pages - 1, pages]
  return [1, '…', page - 1, page, page + 1, '…', pages]
}

function exportUsers(rows) {
  exportRowsToExcel(
    rows.map((u) => ({
      Ism: u.name,
      Login: u.username,
      Email: u.email || '—',
      Rol: ROLE_LABEL[u.role] || u.role,
      Telefon: u.phone || '—',
      Holat: u.blocked ? 'Bloklangan' : 'Faol',
      "Qo'shilgan sana": formatDate(u.createdAt),
    })),
    'Foydalanuvchilar',
    'foydalanuvchilar.xlsx',
  )
}

export default function Users() {
  const me = useCurrentUser()
  const { data: users, isLoading } = useOrgUsers()
  const update = useUpdateUser()
  const del = useDeleteUser()

  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selected, setSelected] = useState(() => new Set())

  const [open, setOpen] = useState(false)
  const [viewUser, setViewUser] = useState(null)
  const [editUser, setEditUser] = useState(null)

  const list = users || []

  const stats = useMemo(() => {
    const now = new Date()
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const total = list.length
    const active = list.filter((u) => !u.blocked).length
    const blocked = list.filter((u) => u.blocked).length
    const thisNew = list.filter((u) => inMonth(u.createdAt, now)).length
    const lastNew = list.filter((u) => inMonth(u.createdAt, prev)).length
    const share = (n) => (total ? `${Math.round((n / total) * 100)}%` : '0%')
    return {
      total,
      active,
      blocked,
      thisNew,
      activeShare: share(active),
      blockedShare: share(blocked),
      newDelta: formatDelta(thisNew, lastNew),
    }
  }, [list])

  const roleBreakdown = useMemo(() => {
    return ROLE_OPTIONS.map((r) => ({
      id: r.value,
      name: r.label,
      value: list.filter((u) => u.role === r.value).length,
      color: ROLE_COLOR[r.value],
    })).filter((r) => r.value > 0)
  }, [list])

  const recentActivity = useMemo(() => {
    return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)
  }, [list])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return list.filter((u) => {
      if (role && u.role !== role) return false
      if (status === 'active' && u.blocked) return false
      if (status === 'blocked' && !u.blocked) return false
      if (q) {
        const hay = `${u.name} ${u.username} ${u.email || ''} ${u.phone || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [list, search, role, status])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize) || 1)
  const safePage = Math.min(page, pages)
  const start = (safePage - 1) * pageSize
  const pageRows = filtered.slice(start, start + pageSize)
  const fromN = filtered.length ? start + 1 : 0
  const toN = Math.min(start + pageSize, filtered.length)

  useEffect(() => {
    setPage(1)
  }, [search, role, status, pageSize])

  useEffect(() => {
    if (page > pages) setPage(pages)
  }, [page, pages])

  const filtersDirty = Boolean(search || role || status)
  const resetFilters = () => {
    setSearch('')
    setRole('')
    setStatus('')
  }
  const toggleStatus = (value) => setStatus((cur) => (cur === value ? '' : value))

  const allPageSelected = pageRows.length > 0 && pageRows.every((u) => selected.has(u.id))
  const toggleAllPage = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allPageSelected) pageRows.forEach((u) => next.delete(u.id))
      else pageRows.forEach((u) => next.add(u.id))
      return next
    })
  }
  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const exportCurrent = () => {
    const rows = selected.size ? filtered.filter((u) => selected.has(u.id)) : filtered
    exportUsers(rows)
  }

  const remove = async (u) => {
    if (!confirm(`"${u.name}" foydalanuvchisini o'chirmoqchimisiz?`)) return
    try {
      await del.mutateAsync(u.id)
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(u.id)
        return next
      })
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title="Foydalanuvchilar"
        crumbs={['Asosiy', 'Foydalanuvchilar']}
        subtitle="Tizimdan foydalanadigan barcha foydalanuvchilar ro'yxati va ularning huquqlari."
        action={
          <PrimaryBtn onClick={() => setOpen(true)}>
            <Plus size={16} /> Yangi foydalanuvchi
          </PrimaryBtn>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Jami foydalanuvchilar" value={stats.total} icon={UsersIcon} tone="brand" onClick={() => setStatus('')} />
        <KpiCard
          title="Faol foydalanuvchilar"
          value={stats.active}
          delta={stats.activeShare}
          icon={UserCheck}
          tone="green"
          onClick={() => toggleStatus('active')}
          active={status === 'active'}
        />
        <KpiCard
          title="Bloklangan"
          value={stats.blocked}
          delta={stats.blockedShare}
          icon={Ban}
          tone="red"
          onClick={() => toggleStatus('blocked')}
          active={status === 'blocked'}
        />
        <KpiCard title="Bu oy qo'shilgan" value={stats.thisNew} delta={stats.newDelta} icon={UserPlus} tone="violet" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className={searchWrapClass}>
          <Search size={16} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ism, login yoki telefon bo'yicha qidirish..."
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <Select value={role} onChange={setRole} options={ROLE_FILTER_OPTIONS} className="w-48" />
        <Select value={status} onChange={setStatus} options={STATUS_FILTER_OPTIONS} className="w-44" />
        {filtersDirty && (
          <button type="button" onClick={resetFilters} className="text-sm font-semibold text-brand-600 hover:text-brand-700">
            Tozalash
          </button>
        )}
        <button
          type="button"
          onClick={exportCurrent}
          disabled={!filtered.length}
          className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-40"
        >
          <Download size={15} /> Excelga eksport
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
          <p className="text-[15px] font-semibold text-ink">
            Foydalanuvchilar ro'yxati <span className="font-medium text-muted">({filtered.length} ta)</span>
            {selected.size > 0 && <span className="ml-2 text-sm font-medium text-brand-600">· {selected.size} ta tanlandi</span>}
          </p>
        </div>

        {isLoading && <p className="px-5 py-12 text-center text-sm text-muted">Yuklanmoqda...</p>}

        {!isLoading && !filtered.length && (
          <EmptyState title="Foydalanuvchi topilmadi" hint="Qidiruv yoki filtrlarni o'zgartirib ko'ring." />
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <th className="w-10 px-4 py-3.5 sm:px-5">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleAllPage}
                      className="h-4 w-4 accent-brand-600"
                      aria-label="Sahifadagi barchasini tanlash"
                    />
                  </th>
                  <th className="px-2 py-3.5">#</th>
                  <th className="px-3 py-3.5">Foydalanuvchi</th>
                  <th className="px-3 py-3.5">Login</th>
                  <th className="px-3 py-3.5">Rol</th>
                  <th className="px-3 py-3.5">Telefon</th>
                  <th className="px-3 py-3.5">Qo'shilgan sana</th>
                  <th className="px-3 py-3.5">Holat</th>
                  <th className="sticky right-0 bg-slate-50/95 px-3 py-3.5 text-right shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.25)]">
                    Amallar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pageRows.map((row, i) => {
                  const isSelf = row.id === me?.id
                  return (
                    <tr key={row.id} className="group transition hover:bg-slate-50/80">
                      <td className="px-4 py-3 sm:px-5">
                        <input
                          type="checkbox"
                          checked={selected.has(row.id)}
                          onChange={() => toggleOne(row.id)}
                          className="h-4 w-4 accent-brand-600"
                          aria-label={`${row.name} ni tanlash`}
                        />
                      </td>
                      <td className="px-2 py-3 text-slate-400">{start + i + 1}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={row.name} color={colorFor(row.name)} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink">{row.name}</p>
                            <p className="truncate text-xs text-muted">{row.email || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-mono text-xs text-slate-500">{row.username}</span>
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone="brand">{ROLE_LABEL[row.role]}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-[13px] text-slate-600">{row.phone || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-[13px] text-slate-600">{formatDate(row.createdAt)}</td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          disabled={isSelf}
                          title={isSelf ? "O'zingizning holatingizni o'zgartira olmaysiz" : undefined}
                          onClick={() => update.mutate({ id: row.id, blocked: !row.blocked })}
                          className={cn(
                            'chip',
                            row.blocked ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700',
                            isSelf && 'cursor-not-allowed opacity-50',
                          )}
                        >
                          {row.blocked ? 'Bloklangan' : 'Faol'}
                        </button>
                      </td>
                      <td className="sticky right-0 bg-white px-3 py-3 shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.25)] group-hover:bg-slate-50/80">
                        <div className="flex items-center justify-end gap-0.5">
                          <IconBtn label="Ko'rish" onClick={() => setViewUser(row)}>
                            <Eye size={15} />
                          </IconBtn>
                          <IconBtn label="Tahrirlash" onClick={() => setEditUser(row)}>
                            <Pencil size={15} />
                          </IconBtn>
                          <IconBtn
                            label={isSelf ? "O'zingizni o'chira olmaysiz" : "O'chirish"}
                            onClick={() => !isSelf && remove(row)}
                            danger
                            disabled={isSelf}
                          >
                            <Trash2 size={15} />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
              <span className="flex items-center gap-2">
                Sahifada:
                <Select value={String(pageSize)} onChange={(v) => setPageSize(Number(v))} options={PAGE_SIZES} className="w-[72px]" />
              </span>
              <span>
                {fromN}–{toN} dan {filtered.length} gacha
              </span>
            </div>
            <div className="flex items-center gap-1">
              <PageBtn disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} label="Oldingi">
                <ChevronLeft size={16} />
              </PageBtn>
              {visiblePages(safePage, pages).map((item, idx) =>
                item === '…' ? (
                  <span key={`e${idx}`} className="grid h-8 w-8 place-items-center text-slate-400">
                    …
                  </span>
                ) : (
                  <PageBtn key={item} active={item === safePage} onClick={() => setPage(item)}>
                    {item}
                  </PageBtn>
                ),
              )}
              <PageBtn disabled={safePage >= pages} onClick={() => setPage(safePage + 1)} label="Keyingi">
                <ChevronRight size={16} />
              </PageBtn>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="card p-5 xl:col-span-2">
          <h3 className="text-[15px] font-semibold text-ink">Rollar bo'yicha taqsimot</h3>
          {roleBreakdown.length ? (
            <div className="mt-2 flex items-center gap-4">
              <div className="relative h-40 w-40 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={roleBreakdown} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2} stroke="none">
                      {roleBreakdown.map((entry) => (
                        <Cell key={entry.id} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-2xl font-bold leading-tight text-ink">{stats.total}</p>
                  <p className="text-[11px] text-muted">Jami</p>
                </div>
              </div>
              <ul className="min-w-0 flex-1 space-y-2">
                {roleBreakdown.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
                      <span className="truncate text-slate-600">{r.name}</span>
                    </span>
                    <span className="shrink-0 font-semibold text-ink">
                      {r.value} ({stats.total ? Math.round((r.value / stats.total) * 100) : 0}%)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="py-16 text-center text-[13px] text-muted">Ma'lumot yo'q</p>
          )}
        </div>

        <div className="card p-5 xl:col-span-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-ink">So'nggi faoliyat</h3>
          </div>
          <ul className="mt-4 space-y-4">
            {recentActivity.map((u, i) => (
              <li key={u.id} className="relative flex gap-3 pb-4 last:pb-0">
                {i < recentActivity.length - 1 && <span className="absolute left-[5px] top-3 h-full w-px bg-slate-100" />}
                <span className="relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorFor(u.name) }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-ink">
                    <span className="font-semibold">{u.name}</span> qo'shildi
                  </p>
                  <p className="text-xs text-muted">{formatDate(u.createdAt, true)}</p>
                </div>
              </li>
            ))}
            {!recentActivity.length && <p className="py-8 text-center text-sm text-muted">Faoliyat topilmadi</p>}
          </ul>
        </div>
      </div>

      <UserFormModal open={open} onClose={() => setOpen(false)} />
      <UserFormModal key={editUser?.id || 'edit'} open={Boolean(editUser)} onClose={() => setEditUser(null)} user={editUser} />
      <UserViewModal user={viewUser} onClose={() => setViewUser(null)} />
    </div>
  )
}

function IconBtn({ children, onClick, label, danger, disabled }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
        danger ? 'hover:text-rose-600' : 'hover:text-brand-600',
      )}
    >
      {children}
    </button>
  )
}

function PageBtn({ children, onClick, disabled, active, label }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'grid h-8 min-w-8 place-items-center rounded-lg px-2 text-sm font-semibold transition disabled:opacity-40',
        active ? 'bg-brand-600 text-white shadow-[0_6px_16px_rgba(59,108,245,0.28)]' : 'text-slate-500 hover:bg-slate-50',
      )}
    >
      {children}
    </button>
  )
}

function UserViewModal({ user, onClose }) {
  return (
    <Modal open={Boolean(user)} onClose={onClose} title="Foydalanuvchi ma'lumotlari">
      {user && (
        <div className="space-y-4">
          <div className="flex items-center gap-3.5">
            <Avatar name={user.name} color={colorFor(user.name)} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-ink">{user.name}</p>
              <Badge tone="brand">{ROLE_LABEL[user.role]}</Badge>
            </div>
          </div>
          <div className="space-y-2.5 rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-2.5 text-sm">
              <ShieldCheck size={15} className="shrink-0 text-slate-400" />
              <span className="font-mono text-slate-600">{user.username}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <Mail size={15} className="shrink-0 text-slate-400" />
              <span className="truncate text-slate-600">{user.email || '—'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <Phone size={15} className="shrink-0 text-slate-400" />
              <span className="text-slate-600">{user.phone || '—'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <Calendar size={15} className="shrink-0 text-slate-400" />
              <span className="text-slate-600">{formatDate(user.createdAt)}</span>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-slate-100 p-4">
            <span className="text-sm font-medium text-slate-500">Holat</span>
            <span className={cn('chip', user.blocked ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700')}>
              {user.blocked ? 'Bloklangan' : 'Faol'}
            </span>
          </div>
        </div>
      )}
    </Modal>
  )
}

function emptyForm(user) {
  return {
    name: user?.name || '',
    username: user?.username || '',
    password: '',
    role: user?.role || 'manager',
    phone: user?.phone || '',
    blocked: user?.blocked ? 'blocked' : 'active',
  }
}

function UserFormModal({ open, onClose, user }) {
  const create = useCreateUser()
  const update = useUpdateUser()
  const { data: employees } = useEmployees()
  const isEdit = Boolean(user)
  const [form, setForm] = useState(() => emptyForm(user))
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setForm(emptyForm(user))
      setError('')
    }
  }, [open, user])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const pending = create.isPending || update.isPending

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (isEdit) {
        const payload = { name: form.name, phone: form.phone, role: form.role, blocked: form.blocked === 'blocked' }
        if (form.password) payload.password = form.password
        await update.mutateAsync({ id: user.id, ...payload })
      } else {
        await create.mutateAsync({ name: form.name, username: form.username, password: form.password, role: form.role, phone: form.phone })
      }
      onClose()
    } catch (e2) {
      setError(e2.message)
    }
  }

  const unlinkedEmployees = (employees || []).filter((e) => !e.userId)

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Foydalanuvchini tahrirlash' : 'Yangi foydalanuvchi'}>
      <form onSubmit={submit} className="space-y-3.5">
        <Field label="Ism">
          <input className={inputClass} value={form.name} onChange={set('name')} required />
        </Field>
        {isEdit ? (
          <Field label="Login">
            <input className={cn(inputClass, 'bg-slate-50 text-slate-400')} value={form.username} disabled />
          </Field>
        ) : (
          <Field label="Login">
            <input className={inputClass} value={form.username} onChange={set('username')} required />
          </Field>
        )}
        <Field label="Telefon">
          <input className={inputClass} value={form.phone} onChange={set('phone')} placeholder="+998 90 000 00 00" />
        </Field>
        <Field label={isEdit ? "Yangi parol (ixtiyoriy)" : 'Parol'}>
          <input
            type="password"
            className={inputClass}
            value={form.password}
            onChange={set('password')}
            required={!isEdit}
            minLength={6}
            placeholder={isEdit ? "O'zgartirmaslik uchun bo'sh qoldiring" : undefined}
          />
        </Field>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Rol">
            <Select value={form.role} onChange={(v) => setForm((f) => ({ ...f, role: v }))} options={ROLE_OPTIONS} />
          </Field>
          {isEdit && (
            <Field label="Holat">
              <Select
                value={form.blocked}
                onChange={(v) => setForm((f) => ({ ...f, blocked: v }))}
                options={[
                  { value: 'active', label: 'Faol' },
                  { value: 'blocked', label: 'Bloklangan' },
                ]}
              />
            </Field>
          )}
        </div>
        {!isEdit && form.role === 'employee' && unlinkedEmployees.length > 0 && (
          <p className="text-xs text-muted">
            Eslatma: hisob yaratilgandan so'ng, uni Xodimlar bo'limida tegishli xodim profiliga bog'lang — shunda u o'zi tasdiqlash imkoniga
            ega bo'ladi.
          </p>
        )}
        <ErrorNote>{error}</ErrorNote>
        <div className="flex gap-2">
          <SecondaryBtn type="button" onClick={onClose} className="flex-1">
            Bekor qilish
          </SecondaryBtn>
          <PrimaryBtn type="submit" disabled={pending} className="flex-1">
            {pending ? 'Saqlanmoqda...' : 'Saqlash'}
          </PrimaryBtn>
        </div>
      </form>
    </Modal>
  )
}
