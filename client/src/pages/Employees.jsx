import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  Eye,
  IdCard,
  ImagePlus,
  LayoutGrid,
  LayoutList,
  Loader2,
  MoreHorizontal,
  PauseCircle,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react'
import {
  useCreateEmployee,
  useDeleteEmployee,
  useEmployees,
  useUpdateEmployee,
  useUploadDocument,
} from '../api/queries'
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
import { EmployeeBadgeLabel } from '../components/QrLabel'
import { employeeStatus, formatDate } from '../lib/format'
import { exportRowsToExcel } from '../lib/excel'

const PAGE_SIZES = [
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
]

const COLUMNS = [
  { key: 'photo', label: 'Foto' },
  { key: 'fullName', label: 'F.I.Sh.', locked: true },
  { key: 'department', label: "Bo'lim" },
  { key: 'position', label: 'Lavozim' },
  { key: 'phone', label: 'Telefon' },
  { key: 'badgeCode', label: 'Badge kodi' },
  { key: 'status', label: 'Status' },
  { key: 'hiredAt', label: 'Kirgan sana' },
  { key: 'actions', label: 'Amallar' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'Barcha holatlar' },
  { value: 'active', label: 'Faol' },
  { value: 'on_leave', label: "Ta'tilda" },
  { value: 'terminated', label: "Ishdan bo'shagan" },
]

const FORM_STATUS_OPTIONS = STATUS_OPTIONS.filter((o) => o.value)

const ASSIGN_OPTIONS = [
  { value: '', label: 'Barcha xodimlar' },
  { value: 'yes', label: 'Biriktirilgan buyumi bor' },
  { value: 'no', label: 'Biriktirilgan buyumi yo\'q' },
]

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

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'uz'))
}

function hiredOf(e) {
  return e?.hiredAt || e?.createdAt
}

function toDateInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function fromDateInput(v) {
  if (!v) return new Date().toISOString()
  const d = new Date(`${v}T09:00:00`)
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

function exportEmployees(rows) {
  exportRowsToExcel(
    rows.map((e) => ({
      'F.I.Sh.': e.fullName,
      "Bo'lim": e.department,
      Lavozim: e.position || '—',
      Telefon: e.phone || '—',
      'Badge kodi': e.badgeCode,
      Status: employeeStatus(e).label,
      'Kirgan sana': formatDate(hiredOf(e)),
      'Biriktirilgan buyumlar': e.activeAssignments || 0,
    })),
    'Xodimlar',
    'xodimlar.xlsx',
  )
}

export default function Employees() {
  const navigate = useNavigate()
  const me = useCurrentUser()
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('')
  const [position, setPosition] = useState('')
  const [status, setStatus] = useState('')
  const [hiredFrom, setHiredFrom] = useState('')
  const [hiredTo, setHiredTo] = useState('')
  const [assigned, setAssigned] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [view, setView] = useState('table')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [hiddenCols, setHiddenCols] = useState([])
  const [colsOpen, setColsOpen] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const [rowMenu, setRowMenu] = useState(null)
  const [open, setOpen] = useState(false)
  const [editEmployee, setEditEmployee] = useState(null)
  const [badgeEmployee, setBadgeEmployee] = useState(null)

  const { data: employees, isLoading } = useEmployees()
  const del = useDeleteEmployee()

  const colsRef = useRef(null)
  const rowMenuRef = useRef(null)
  const list = employees || []

  const departmentOptions = useMemo(
    () => [{ value: '', label: "Barcha bo'limlar" }, ...uniqueSorted(list.map((e) => e.department)).map((n) => ({ value: n, label: n }))],
    [list],
  )
  const positionOptions = useMemo(
    () => [{ value: '', label: 'Barcha lavozimlar' }, ...uniqueSorted(list.map((e) => e.position)).map((n) => ({ value: n, label: n }))],
    [list],
  )

  const stats = useMemo(() => {
    const now = new Date()
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const total = list.length
    const active = list.filter((e) => employeeStatus(e).id === 'active').length
    const leave = list.filter((e) => employeeStatus(e).id === 'on_leave').length
    const terminated = list.filter((e) => employeeStatus(e).id === 'terminated').length
    const thisHires = list.filter((e) => inMonth(hiredOf(e), now)).length
    const lastHires = list.filter((e) => inMonth(hiredOf(e), prev)).length
    const share = (n) => (total ? `${Math.round((n / total) * 100)}%` : '0%')
    return {
      total,
      active,
      leave,
      terminated,
      totalDelta: formatDelta(thisHires, lastHires),
      activeDelta: share(active),
      leaveDelta: share(leave),
      goneDelta: share(terminated),
    }
  }, [list])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const fromTs = hiredFrom ? new Date(`${hiredFrom}T00:00:00`).getTime() : null
    const toTs = hiredTo ? new Date(`${hiredTo}T23:59:59`).getTime() : null
    return list.filter((e) => {
      if (department && e.department !== department) return false
      if (position && e.position !== position) return false
      if (status && employeeStatus(e).id !== status) return false
      if (assigned === 'yes' && !(e.activeAssignments > 0)) return false
      if (assigned === 'no' && e.activeAssignments > 0) return false
      const hiredTs = new Date(hiredOf(e)).getTime()
      if (fromTs != null && hiredTs < fromTs) return false
      if (toTs != null && hiredTs > toTs) return false
      if (q) {
        const hay = `${e.fullName} ${e.position || ''} ${e.phone || ''} ${e.department || ''} ${e.badgeCode || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [list, search, department, position, status, assigned, hiredFrom, hiredTo])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize) || 1)
  const safePage = Math.min(page, pages)
  const start = (safePage - 1) * pageSize
  const pageRows = filtered.slice(start, start + pageSize)
  const fromN = filtered.length ? start + 1 : 0
  const toN = Math.min(start + pageSize, filtered.length)

  useEffect(() => {
    setPage(1)
  }, [search, department, position, status, assigned, hiredFrom, hiredTo, pageSize])

  useEffect(() => {
    if (page > pages) setPage(pages)
  }, [page, pages])

  useEffect(() => {
    const onDoc = (e) => {
      if (colsRef.current && !colsRef.current.contains(e.target)) setColsOpen(false)
      if (rowMenuRef.current && !rowMenuRef.current.contains(e.target)) setRowMenu(null)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const filtersDirty = Boolean(search || department || position || status || assigned || hiredFrom || hiredTo)

  const resetFilters = () => {
    setSearch('')
    setDepartment('')
    setPosition('')
    setStatus('')
    setAssigned('')
    setHiredFrom('')
    setHiredTo('')
    setFiltersOpen(false)
  }

  const applyStatus = (value) => setStatus(value)
  const toggleStatus = (value) => setStatus((cur) => (cur === value ? '' : value))

  const colOn = (key) => !hiddenCols.includes(key)
  const toggleCol = (key) => {
    setHiddenCols((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const allPageSelected = pageRows.length > 0 && pageRows.every((e) => selected.has(e.id))
  const toggleAllPage = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allPageSelected) pageRows.forEach((e) => next.delete(e.id))
      else pageRows.forEach((e) => next.add(e.id))
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
    const rows = selected.size ? filtered.filter((e) => selected.has(e.id)) : filtered
    exportEmployees(rows)
  }

  const remove = async (e) => {
    if (!confirm(`"${e.fullName}" xodimini o'chirmoqchimisiz?`)) return
    try {
      await del.mutateAsync(e.id)
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(e.id)
        return next
      })
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title="Xodimlar"
        crumbs={['Asosiy', 'Xodimlar']}
        subtitle="Tizimda ishlayotgan xodimlar ro'yxati, lavozimi va ma'lumotlari."
        action={
          <PrimaryBtn onClick={() => setOpen(true)}>
            <Plus size={16} /> Yangi xodim
          </PrimaryBtn>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Jami xodimlar"
          value={stats.total}
          delta={stats.totalDelta}
          icon={Users}
          tone="brand"
          onClick={() => applyStatus('')}
        />
        <KpiCard
          title="Faol xodimlar"
          value={stats.active}
          delta={stats.activeDelta}
          icon={UserCheck}
          tone="green"
          onClick={() => toggleStatus('active')}
          active={status === 'active'}
        />
        <KpiCard
          title="Ta'tilda"
          value={stats.leave}
          delta={stats.leaveDelta}
          icon={PauseCircle}
          tone="amber"
          onClick={() => toggleStatus('on_leave')}
          active={status === 'on_leave'}
        />
        <KpiCard
          title="Ishdan bo'shagan"
          value={stats.terminated}
          delta={stats.goneDelta}
          icon={UserX}
          tone="red"
          onClick={() => toggleStatus('terminated')}
          active={status === 'terminated'}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className={searchWrapClass}>
          <Search size={16} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ism, lavozim yoki telefon bo'yicha qidirish..."
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <Select value={department} onChange={setDepartment} options={departmentOptions} className="w-48" />
        <Select value={position} onChange={setPosition} options={positionOptions} className="w-48" />
        <Select value={status} onChange={applyStatus} options={STATUS_OPTIONS} className="w-44" />
        <SecondaryBtn onClick={() => setFiltersOpen((v) => !v)}>
          <SlidersHorizontal size={15} /> Filtrlar
        </SecondaryBtn>
        {filtersDirty && (
          <button type="button" onClick={resetFilters} className="text-sm font-semibold text-brand-600 hover:text-brand-700">
            Tozalash
          </button>
        )}
      </div>

      {filtersOpen && (
        <div className="card flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-[240px]">
            <Field label="Kirgan sana">
              <div className="flex items-center gap-2">
                <input type="date" className={inputClass} value={hiredFrom} onChange={(e) => setHiredFrom(e.target.value)} />
                <span className="text-slate-300">–</span>
                <input type="date" className={inputClass} value={hiredTo} onChange={(e) => setHiredTo(e.target.value)} />
              </div>
            </Field>
          </div>
          <div className="w-56">
            <Field label="Biriktirilgan buyumlar">
              <Select value={assigned} onChange={setAssigned} options={ASSIGN_OPTIONS} />
            </Field>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
          <p className="text-[15px] font-semibold text-ink">
            Xodimlar ro'yxati <span className="font-medium text-muted">({filtered.length} ta)</span>
            {selected.size > 0 && <span className="ml-2 text-sm font-medium text-brand-600">· {selected.size} ta tanlandi</span>}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-xl bg-slate-100/80 p-1">
              <button
                type="button"
                onClick={() => setView('table')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                  view === 'table' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-800',
                )}
              >
                <LayoutList size={14} /> Jadval
              </button>
              <button
                type="button"
                onClick={() => setView('cards')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                  view === 'cards' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-800',
                )}
              >
                <LayoutGrid size={14} /> Kartochkalar
              </button>
            </div>
            <button
              type="button"
              onClick={exportCurrent}
              disabled={!filtered.length}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <Download size={14} /> Eksport
            </button>
            {view === 'table' && (
              <div className="relative" ref={colsRef}>
                <button
                  type="button"
                  onClick={() => setColsOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <Columns3 size={14} /> Ustunlar
                </button>
                {colsOpen && (
                  <div className="absolute right-0 z-20 mt-2 w-52 rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-slate-100">
                    {COLUMNS.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        disabled={c.locked}
                        onClick={() => !c.locked && toggleCol(c.key)}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {c.label}
                        {colOn(c.key) && <Check size={14} className="text-brand-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {isLoading && <p className="px-5 py-12 text-center text-sm text-muted">Yuklanmoqda...</p>}

        {!isLoading && !filtered.length && (
          <EmptyState title="Xodim topilmadi" hint="Qidiruv yoki filtrlarni o'zgartirib ko'ring." />
        )}

        {!isLoading && filtered.length > 0 && view === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
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
                  {colOn('photo') && <th className="px-3 py-3.5">Foto</th>}
                  {colOn('fullName') && <th className="px-3 py-3.5">F.I.Sh.</th>}
                  {colOn('department') && <th className="px-3 py-3.5">Bo'lim</th>}
                  {colOn('position') && <th className="px-3 py-3.5">Lavozim</th>}
                  {colOn('phone') && <th className="px-3 py-3.5">Telefon</th>}
                  {colOn('badgeCode') && <th className="px-3 py-3.5">Badge kodi</th>}
                  {colOn('status') && <th className="px-3 py-3.5">Status</th>}
                  {colOn('hiredAt') && <th className="px-3 py-3.5">Kirgan sana</th>}
                  {colOn('actions') && (
                    <th className="sticky right-0 bg-slate-50/95 px-3 py-3.5 text-right shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.25)]">
                      Amallar
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pageRows.map((row, i) => {
                  const st = employeeStatus(row)
                  return (
                    <tr
                      key={row.id}
                      onClick={() => navigate(`/employees/${row.id}`)}
                      className="group cursor-pointer transition hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-3 sm:px-5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(row.id)}
                          onChange={() => toggleOne(row.id)}
                          className="h-4 w-4 accent-brand-600"
                          aria-label={`${row.fullName} ni tanlash`}
                        />
                      </td>
                      <td className="px-2 py-3 text-slate-400">{start + i + 1}</td>
                      {colOn('photo') && (
                        <td className="px-3 py-3">
                          <EmployeeThumb employee={row} />
                        </td>
                      )}
                      {colOn('fullName') && (
                        <td className="max-w-[220px] px-3 py-3">
                          <p className="truncate font-semibold text-ink">{row.fullName}</p>
                        </td>
                      )}
                      {colOn('department') && <td className="px-3 py-3 text-[13px] text-slate-600">{row.department}</td>}
                      {colOn('position') && <td className="px-3 py-3 text-[13px] text-slate-600">{row.position || '—'}</td>}
                      {colOn('phone') && (
                        <td className="whitespace-nowrap px-3 py-3 text-[13px] text-slate-600">{row.phone || '—'}</td>
                      )}
                      {colOn('badgeCode') && (
                        <td className="px-3 py-3">
                          <span className="font-mono text-xs text-slate-500">{row.badgeCode}</span>
                        </td>
                      )}
                      {colOn('status') && (
                        <td className="px-3 py-3">
                          <Badge tone={st.tone}>{st.label}</Badge>
                        </td>
                      )}
                      {colOn('hiredAt') && (
                        <td className="whitespace-nowrap px-3 py-3 text-[13px] text-slate-600">{formatDate(hiredOf(row))}</td>
                      )}
                      {colOn('actions') && (
                        <td
                          className="sticky right-0 bg-white px-3 py-3 shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.25)] group-hover:bg-slate-50/80"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-0.5">
                            <IconBtn label="Ko'rish" onClick={() => navigate(`/employees/${row.id}`)}>
                              <Eye size={15} />
                            </IconBtn>
                            <IconBtn label="Tahrirlash" onClick={() => setEditEmployee(row)}>
                              <Pencil size={15} />
                            </IconBtn>
                            <div className="relative" ref={rowMenu === row.id ? rowMenuRef : undefined}>
                              <IconBtn
                                label="Yana"
                                onClick={() => setRowMenu((id) => (id === row.id ? null : row.id))}
                              >
                                <MoreHorizontal size={15} />
                              </IconBtn>
                              {rowMenu === row.id && (
                                <div className="absolute right-0 z-20 mt-1 w-44 rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-slate-100">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setBadgeEmployee(row)
                                      setRowMenu(null)
                                    }}
                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-50"
                                  >
                                    <IdCard size={14} /> Badge
                                  </button>
                                  {me?.role === 'admin' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRowMenu(null)
                                        remove(row)
                                      }}
                                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
                                    >
                                      <Trash2 size={14} /> O'chirish
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && filtered.length > 0 && view === 'cards' && (
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {pageRows.map((row) => {
              const st = employeeStatus(row)
              return (
                <article
                  key={row.id}
                  className="flex cursor-pointer flex-col rounded-2xl border border-slate-100 p-4 transition hover:bg-slate-50/80"
                  onClick={() => navigate(`/employees/${row.id}`)}
                >
                  <div className="flex items-start gap-3">
                    <span onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleOne(row.id)}
                        className="mt-1 h-4 w-4 accent-brand-600"
                        aria-label={`${row.fullName} ni tanlash`}
                      />
                    </span>
                    <EmployeeThumb employee={row} large />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{row.fullName}</p>
                      <p className="mt-0.5 text-[13px] font-medium text-slate-500">{row.position || '—'}</p>
                      <p className="mt-0.5 text-[13px] text-brand-600">{row.department}</p>
                    </div>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-ink">{row.phone || '—'}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-slate-400">{row.badgeCode}</p>
                    </div>
                    <div className="flex" onClick={(e) => e.stopPropagation()}>
                      <IconBtn label="Ko'rish" onClick={() => navigate(`/employees/${row.id}`)}>
                        <Eye size={15} />
                      </IconBtn>
                      <IconBtn label="Tahrirlash" onClick={() => setEditEmployee(row)}>
                        <Pencil size={15} />
                      </IconBtn>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
              <span className="flex items-center gap-2">
                Sahifada:
                <Select
                  value={String(pageSize)}
                  onChange={(v) => setPageSize(Number(v))}
                  options={PAGE_SIZES}
                  className="w-[72px]"
                />
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

      <EmployeeModal open={open} onClose={() => setOpen(false)} />
      <EmployeeModal
        key={editEmployee?.id || 'edit'}
        open={Boolean(editEmployee)}
        onClose={() => setEditEmployee(null)}
        employee={editEmployee}
      />
      <Modal open={Boolean(badgeEmployee)} onClose={() => setBadgeEmployee(null)} title="Xodim badge">
        {badgeEmployee && <EmployeeBadgeLabel employee={badgeEmployee} />}
      </Modal>
    </div>
  )
}

function EmployeeThumb({ employee, large }) {
  const box = large ? 'h-14 w-14' : 'h-10 w-10'
  if (employee.photoUrl) {
    return <img src={employee.photoUrl} alt="" className={cn(box, 'rounded-full object-cover ring-1 ring-slate-100')} />
  }
  return <Avatar name={employee.fullName} color={colorFor(employee.fullName)} size={large ? 'lg' : 'md'} />
}

function IconBtn({ children, onClick, label }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-brand-600"
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

function EmployeeModal({ open, onClose, employee }) {
  const create = useCreateEmployee()
  const update = useUpdateEmployee()
  const isEdit = Boolean(employee)
  const [form, setForm] = useState(() => emptyForm(employee))
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setForm(emptyForm(employee))
      setError('')
    }
  }, [open, employee])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const pending = create.isPending || update.isPending

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const payload = {
      fullName: form.fullName,
      department: form.department,
      position: form.position,
      phone: form.phone,
      photoUrl: form.photoUrl,
      status: form.status,
      hiredAt: fromDateInput(form.hiredAt),
    }
    try {
      if (isEdit) await update.mutateAsync({ id: employee.id, ...payload })
      else await create.mutateAsync(payload)
      setForm(emptyForm())
      onClose()
    } catch (e2) {
      setError(e2.message)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Xodimni tahrirlash' : "Yangi xodim qo'shish"} wide>
      <form onSubmit={submit} className="space-y-3.5">
        <ImagePick value={form.photoUrl} onChange={(photoUrl) => setForm((f) => ({ ...f, photoUrl }))} />
        <Field label="F.I.Sh." required>
          <input className={inputClass} value={form.fullName} onChange={set('fullName')} required />
        </Field>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Bo'lim" required>
            <input className={inputClass} value={form.department} onChange={set('department')} placeholder="Masalan: IT bo'limi" required />
          </Field>
          <Field label="Lavozim">
            <input className={inputClass} value={form.position} onChange={set('position')} />
          </Field>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Telefon">
            <input className={inputClass} value={form.phone} onChange={set('phone')} placeholder="+998 90 000 00 00" />
          </Field>
          <Field label="Holat">
            <Select value={form.status} onChange={(v) => setForm((f) => ({ ...f, status: v }))} options={FORM_STATUS_OPTIONS} />
          </Field>
        </div>
        <Field label="Kirgan sana">
          <input type="date" className={inputClass} value={form.hiredAt} onChange={set('hiredAt')} />
        </Field>
        <ErrorNote>{error}</ErrorNote>
        <PrimaryBtn type="submit" disabled={pending} className="w-full">
          {pending ? 'Saqlanmoqda...' : 'Saqlash'}
        </PrimaryBtn>
      </form>
    </Modal>
  )
}

function ImagePick({ value, onChange }) {
  const inputRef = useRef(null)
  const upload = useUploadDocument()

  const handleFile = async (file) => {
    if (!file) return
    try {
      const res = await upload.mutateAsync(file)
      onChange(res.url)
    } catch {
      /* upload error is silent; user can retry */
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={upload.isPending}
        className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-dashed border-slate-200 bg-slate-50 transition hover:border-brand-300 hover:bg-brand-50"
      >
        {upload.isPending ? (
          <Loader2 size={18} className="animate-spin text-brand-600" />
        ) : value ? (
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImagePlus size={18} className="text-slate-400" />
        )}
      </button>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-600">Xodim rasmi</p>
        <p className="text-xs text-muted">Ixtiyoriy. JPG yoki PNG, 10 MB gacha.</p>
        {value && (
          <button type="button" onClick={() => onChange(null)} className="mt-1 text-xs font-semibold text-rose-500">
            Olib tashlash
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  )
}

function emptyForm(employee) {
  return {
    fullName: employee?.fullName || '',
    department: employee?.department || '',
    position: employee?.position || '',
    phone: employee?.phone || '',
    photoUrl: employee?.photoUrl || null,
    status: employeeStatus(employee).id,
    hiredAt: toDateInput(hiredOf(employee) || new Date().toISOString()),
  }
}
