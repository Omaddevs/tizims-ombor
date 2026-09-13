import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import {
  Armchair,
  Cable,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Keyboard,
  Laptop,
  Monitor,
  MoreHorizontal,
  Package,
  Plus,
  Presentation,
  Printer,
  QrCode,
  RotateCcw,
  Search,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react'
import {
  useAssignments,
  useConfirmAssignment,
  useCreateAssignment,
  useEmployees,
  useProducts,
  useReturnAssignment,
  useRooms,
} from '../api/queries'
import { useCurrentUser } from '../store/useAuthStore'
import {
  Avatar,
  Badge,
  EmptyState,
  ErrorNote,
  Field,
  Modal,
  PageHeader,
  PrimaryBtn,
  SecondaryBtn,
  cn,
  inputClass,
} from '../components/ui'
import { Select } from '../components/Select'
import { FileDrop } from '../components/FileDrop'
import { AssignmentQrLabel } from '../components/QrLabel'
import { assignmentTarget, roomTitle } from '../lib/assignment'
import { formatDate } from '../lib/format'

const PAGE_SIZES = [
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
]

const STATUS_LABEL = { active: 'Foydalanishda', pending: 'Tasdiq kutilmoqda', returned: 'Qaytarilgan' }
const STATUS_TONE = { active: 'green', pending: 'orange', returned: 'red' }
const STATUS_DATE = { active: 'text-emerald-600', pending: 'text-emerald-600', returned: 'text-rose-500' }

const STATUS_OPTIONS = [
  { value: '', label: 'Barcha statuslar' },
  { value: 'pending', label: 'Tasdiq kutilmoqda' },
  { value: 'active', label: 'Foydalanishda' },
  { value: 'returned', label: 'Qaytarilgan' },
]

const FILE_OPTIONS = [
  { value: '', label: 'Barcha fayllar' },
  { value: 'image', label: 'Rasmlar' },
  { value: 'pdf', label: 'PDF hujjatlar' },
  { value: 'sheet', label: 'Excel' },
  { value: 'qr', label: 'QR yorliq' },
]

const TARGET_KIND_OPTIONS = [
  { value: '', label: 'Xodim va xona' },
  { value: 'employee', label: 'Faqat xodimlar' },
  { value: 'room', label: 'Faqat xonalar' },
]

const AVATAR_COLORS = ['#3b6cf5', '#7c3aed', '#0d9488', '#f59e0b', '#f43f5e', '#0284c7', '#059669', '#64748b']

function colorFor(name = '') {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function visiblePages(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  if (page <= 4) return [1, 2, 3, 4, 5, '…', pages]
  if (page >= pages - 3) return [1, '…', pages - 4, pages - 3, pages - 2, pages - 1, pages]
  return [1, '…', page - 1, page, page + 1, '…', pages]
}

function todayInput() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dateToIso(dateStr) {
  const [y, m, d] = String(dateStr || '')
    .split('-')
    .map(Number)
  if (!y || !m || !d) return new Date().toISOString()
  const picked = new Date(y, m - 1, d)
  const now = new Date()
  if (picked.toDateString() === now.toDateString()) return now.toISOString()
  picked.setHours(12, 0, 0, 0)
  return picked.toISOString()
}

function dayStamp(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatBytes(n) {
  const size = Number(n)
  if (!size) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function extOf(name = '', url = '') {
  const s = `${name} ${url}`
  const m = s.match(/\.([a-z0-9]{2,5})(?:\?|$)/i)
  return m ? m[1].toLowerCase() : ''
}

function fileKind(name = '', url = '') {
  const ext = extOf(name, url)
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'sheet'
  if (/image\//.test(name) || /image\//.test(url)) return 'image'
  return 'file'
}

function isGeneratedName(name = '') {
  return /^\d{10,}_/.test(name)
}

function fileMeta(row) {
  const url = row.documentUrl || row.product?.photoUrl || null
  const name = row.documentName || ''
  if (url) {
    const kind = fileKind(name, url)
    const ext = (extOf(name, url) || (kind === 'image' ? 'jpg' : kind === 'pdf' ? 'pdf' : '')).toUpperCase()
    const pretty = name && !isGeneratedName(name) ? name.replace(/\.[^.]+$/, '') : ''
    const title =
      kind === 'image'
        ? pretty
          ? `Rasm (${ext || 'JPG'})`
          : `Rasm (${ext || 'JPG'})`
        : kind === 'pdf'
          ? pretty
            ? `PDF (${pretty})`
            : 'Hujjat (PDF)'
          : kind === 'sheet'
            ? pretty
              ? `Excel (${pretty})`
              : `Excel (${ext || 'XLSX'})`
            : pretty || 'Fayl'
    return { kind, title, size: formatBytes(row.documentSize), url, downloadName: name || undefined }
  }
  return { kind: 'qr', title: 'QR yorlig\'i', size: '', url: null, downloadName: `${row.assetTag || 'yorliq'}.png` }
}

function productVisual(name = '') {
  const n = name.toLowerCase()
  if (n.includes('monitor')) return { Icon: Monitor, bg: 'bg-[#eef2ff]', fg: 'text-indigo-600' }
  if (n.includes('proyektor') || n.includes('projector')) return { Icon: Presentation, bg: 'bg-violet-50', fg: 'text-violet-600' }
  if (n.includes('noutbuk') || n.includes('laptop')) return { Icon: Laptop, bg: 'bg-sky-50', fg: 'text-sky-600' }
  if (n.includes('klaviatura') || n.includes('sichqon')) return { Icon: Keyboard, bg: 'bg-slate-100', fg: 'text-slate-600' }
  if (n.includes('toner') || n.includes('printer')) return { Icon: Printer, bg: 'bg-zinc-100', fg: 'text-zinc-600' }
  if (n.includes('kreslo') || n.includes('stul')) return { Icon: Armchair, bg: 'bg-amber-50', fg: 'text-amber-700' }
  if (n.includes('stol')) return { Icon: Package, bg: 'bg-orange-50', fg: 'text-orange-600' }
  if (n.includes('kabel')) return { Icon: Cable, bg: 'bg-blue-50', fg: 'text-blue-600' }
  return { Icon: Package, bg: 'bg-slate-50', fg: 'text-slate-400' }
}

function FileGlyph({ kind }) {
  const map = {
    image: { Icon: ImageIcon, box: 'bg-rose-50 text-rose-500' },
    pdf: { Icon: FileText, box: 'bg-red-50 text-red-500' },
    sheet: { Icon: FileSpreadsheet, box: 'bg-emerald-50 text-emerald-600' },
    qr: { Icon: QrCode, box: 'bg-brand-50 text-brand-600' },
    file: { Icon: FileText, box: 'bg-slate-100 text-slate-500' },
  }
  const { Icon, box } = map[kind] || map.file
  return (
    <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', box)}>
      <Icon size={18} />
    </span>
  )
}

async function downloadQr(assignment) {
  const url = await QRCode.toDataURL(assignment.qrToken, { width: 512, margin: 1, color: { dark: '#101828' } })
  const a = document.createElement('a')
  a.href = url
  a.download = `${assignment.assetTag || 'qr'}.png`
  a.click()
}

function downloadUrl(url, name) {
  const a = document.createElement('a')
  a.href = url
  a.download = name || ''
  a.target = '_blank'
  a.rel = 'noopener'
  a.click()
}

export default function Assignments() {
  const navigate = useNavigate()
  const me = useCurrentUser()
  const isStaff = ['admin', 'manager'].includes(me?.role)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [roomId, setRoomId] = useState('')
  const [targetKind, setTargetKind] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [fileType, setFileType] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selected, setSelected] = useState(() => new Set())
  const [rowMenu, setRowMenu] = useState(null)
  const [labelFor, setLabelFor] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)

  const { data: assignments, isLoading } = useAssignments()
  const { data: employees } = useEmployees()
  const { data: rooms } = useRooms()
  const confirmAssignment = useConfirmAssignment()
  const returnAssignment = useReturnAssignment()
  const rowMenuRef = useRef(null)

  const list = assignments || []

  const stats = useMemo(
    () => ({
      all: list.length,
      pending: list.filter((a) => a.status === 'pending').length,
      active: list.filter((a) => a.status === 'active').length,
      returned: list.filter((a) => a.status === 'returned').length,
    }),
    [list],
  )

  const employeeOptions = useMemo(() => {
    const source = isStaff ? employees || [] : list.map((a) => a.employee).filter(Boolean)
    const uniq = []
    const seen = new Set()
    source.forEach((e) => {
      if (!e?.id || seen.has(e.id)) return
      seen.add(e.id)
      uniq.push(e)
    })
    return [{ value: '', label: 'Barcha xodimlar' }, ...uniq.map((e) => ({ value: e.id, label: e.fullName }))]
  }, [employees, list, isStaff])

  const roomOptions = useMemo(() => {
    const source = isStaff ? rooms || [] : list.map((a) => a.room).filter(Boolean)
    const uniq = []
    const seen = new Set()
    source.forEach((r) => {
      if (!r?.id || seen.has(r.id)) return
      seen.add(r.id)
      uniq.push(r)
    })
    uniq.sort((a, b) => String(a.number).localeCompare(String(b.number), 'uz', { numeric: true }))
    return [{ value: '', label: 'Barcha xonalar' }, ...uniq.map((r) => ({ value: r.id, label: roomTitle(r) }))]
  }, [rooms, list, isStaff])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return list.filter((a) => {
      if (status && a.status !== status) return false
      if (employeeId && a.employeeId !== employeeId) return false
      if (roomId && a.roomId !== roomId) return false
      if (targetKind === 'room' && a.targetType !== 'room' && !a.roomId) return false
      if (targetKind === 'employee' && (a.targetType === 'room' || a.roomId) && !a.employeeId) return false
      if (targetKind === 'employee' && !a.employeeId) return false
      if (targetKind === 'room' && !a.roomId) return false
      if (from && dayStamp(a.assignedAt) < from) return false
      if (to && dayStamp(a.assignedAt) > to) return false
      const file = fileMeta(a)
      if (fileType && file.kind !== fileType) return false
      if (q) {
        const hay = [
          a.product?.name,
          a.assetTag,
          a.product?.barcode,
          a.employee?.fullName,
          a.employee?.department,
          a.employee?.position,
          a.room?.number,
          a.room?.name,
          a.room?.building,
          file.title,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [list, status, search, employeeId, roomId, targetKind, from, to, fileType])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize) || 1)
  const safePage = Math.min(page, pages)
  const start = (safePage - 1) * pageSize
  const pageRows = filtered.slice(start, start + pageSize)
  const fromN = filtered.length ? start + 1 : 0
  const toN = Math.min(start + pageSize, filtered.length)

  useEffect(() => {
    setPage(1)
  }, [search, status, employeeId, roomId, targetKind, from, to, fileType, pageSize])

  useEffect(() => {
    if (page > pages) setPage(pages)
  }, [page, pages])

  useEffect(() => {
    const onDoc = (e) => {
      if (rowMenuRef.current && !rowMenuRef.current.contains(e.target)) setRowMenu(null)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const filtersDirty = Boolean(search || status || employeeId || roomId || targetKind || from || to || fileType)

  const resetFilters = () => {
    setSearch('')
    setStatus('')
    setEmployeeId('')
    setRoomId('')
    setTargetKind('')
    setFrom('')
    setTo('')
    setFileType('')
    setFiltersOpen(false)
  }

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const doDownload = async (row) => {
    const file = fileMeta(row)
    if (file.url) downloadUrl(file.url, file.downloadName)
    else await downloadQr(row)
  }

  const openRow = (row) => navigate(`/assignments/${row.id}`)

  const doConfirm = async (row) => {
    try {
      await confirmAssignment.mutateAsync(row.id)
      setRowMenu(null)
    } catch (e) {
      alert(e.message)
    }
  }

  const doReturn = async (row) => {
    if (!window.confirm(`"${row.product?.name || 'Buyum'}" ni omborga qaytarmoqchimisiz?`)) return
    try {
      await returnAssignment.mutateAsync(row.id)
      setRowMenu(null)
    } catch (e) {
      alert(e.message)
    }
  }

  const tabs = [
    { id: '', label: 'Barchasi', count: stats.all, dot: null, countIdle: 'bg-brand-50 text-brand-600' },
    { id: 'pending', label: 'Tasdiq kutilmoqda', count: stats.pending, dot: 'bg-amber-400', countIdle: 'bg-amber-50 text-amber-600' },
    { id: 'active', label: 'Foydalanishda', count: stats.active, dot: 'bg-emerald-500', countIdle: 'bg-emerald-50 text-emerald-600' },
    { id: 'returned', label: 'Qaytarilgan', count: stats.returned, dot: 'bg-rose-500', countIdle: 'bg-rose-50 text-rose-500' },
  ]

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title="Biriktirmalar"
        crumbs={['Asosiy', 'Biriktirmalar']}
        subtitle="Mahsulotni xodim yoki xonaga biriktiring. QR kodni skanerlang — qayerda ekani chiqadi."
        action={
          isStaff ? (
            <PrimaryBtn onClick={() => setCreateOpen(true)} className="whitespace-nowrap">
              <Plus size={16} /> Yangi biriktirma
            </PrimaryBtn>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = status === tab.id
          return (
            <button
              key={tab.id || 'all'}
              type="button"
              onClick={() => setStatus(tab.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition',
                active
                  ? 'bg-brand-600 text-white shadow-[0_6px_16px_rgba(59,108,245,0.28)]'
                  : 'bg-white text-slate-600 shadow-sm ring-1 ring-slate-100 hover:bg-slate-50',
              )}
            >
              {tab.dot && !active ? <span className={cn('h-2 w-2 rounded-full', tab.dot)} /> : null}
              {tab.label}
              <span
                className={cn(
                  'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold',
                  active ? 'bg-white/20 text-white' : tab.countIdle,
                )}
              >
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="card flex flex-wrap items-center gap-2.5 p-3 sm:px-4">
        <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
          <Search size={16} className="shrink-0 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Mahsulot, QR, xona raqami yoki xodim..."
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <Select value={status} onChange={setStatus} options={STATUS_OPTIONS} className="w-[168px] shrink-0" />
        {isStaff && <Select value={employeeId} onChange={setEmployeeId} options={employeeOptions} className="w-[168px] shrink-0" />}
        {isStaff && <Select value={roomId} onChange={setRoomId} options={roomOptions} className="w-[168px] shrink-0" />}
        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          <CalendarDays size={16} className="shrink-0 text-slate-400" />
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[118px] bg-transparent text-sm outline-none" />
          <span className="text-slate-300">–</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[118px] bg-transparent text-sm outline-none" />
        </div>
        <SecondaryBtn onClick={() => setFiltersOpen((v) => !v)} className="shrink-0">
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
          <div className="w-56">
            <Field label="Fayl turi">
              <Select value={fileType} onChange={setFileType} options={FILE_OPTIONS} />
            </Field>
          </div>
          <div className="w-56">
            <Field label="Biriktirilgan">
              <Select value={targetKind} onChange={setTargetKind} options={TARGET_KIND_OPTIONS} />
            </Field>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {isLoading && <p className="px-5 py-12 text-center text-sm text-muted">Yuklanmoqda...</p>}

        {!isLoading && !filtered.length && (
          <EmptyState title="Biriktirmalar topilmadi" hint="Qidiruv yoki filtrlarni o'zgartirib ko'ring." />
        )}

        {!isLoading && filtered.length > 0 && (
          <>
            <div className="divide-y divide-slate-100 md:hidden">
              {pageRows.map((row) => (
                <AssignmentCard
                  key={row.id}
                  row={row}
                  selected={selected.has(row.id)}
                  onToggle={() => toggleOne(row.id)}
                  onView={() => openRow(row)}
                  onDownload={() => doDownload(row)}
                />
              ))}
            </div>

            <div className="hidden md:block">
              <div className="divide-y divide-slate-100">
                {pageRows.map((row) => {
                  const file = fileMeta(row)
                  return (
                    <div
                      key={row.id}
                      className="grid grid-cols-[36px_minmax(0,1.35fr)_minmax(0,0.9fr)_minmax(0,1.05fr)_92px_auto_auto] items-center gap-x-3 px-4 py-3.5 transition hover:bg-slate-50/80 sm:px-5"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleOne(row.id)}
                        className="h-4 w-4 justify-self-center accent-brand-600"
                        aria-label={`${row.product?.name || 'Biriktirma'} ni tanlash`}
                      />
                      <button type="button" onClick={() => openRow(row)} className="flex min-w-0 items-center gap-3 text-left">
                        <ProductThumb product={row.product} />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-ink">{row.product?.name || '—'}</span>
                          <span className="mt-0.5 block truncate text-[12px] text-muted">
                            {row.assetTag}
                            {row.quantity ? ` · ${row.quantity} ${row.product?.unit || 'dona'}` : ''}
                          </span>
                        </span>
                      </button>
                      <div className="flex min-w-0 items-center gap-3">
                        <FileGlyph kind={file.kind} />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-ink">{file.title}</p>
                          {file.size ? <p className="truncate text-[12px] text-muted">{file.size}</p> : null}
                        </div>
                      </div>
                      <button type="button" onClick={() => openRow(row)} className="min-w-0 text-left">
                        <TargetCell row={row} />
                      </button>
                      <div className="whitespace-nowrap">
                        <p className={cn('text-[13px] font-semibold', STATUS_DATE[row.status])}>{formatDate(row.assignedAt)}</p>
                        <p className="text-[12px] text-muted">{formatTime(row.assignedAt)}</p>
                      </div>
                      <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge>
                      <div className="flex items-center justify-end gap-1.5">
                        <IconBtn label="Ko'rish" onClick={() => openRow(row)}>
                          <Eye size={15} />
                        </IconBtn>
                        <IconBtn label="Yuklab olish" onClick={() => doDownload(row)}>
                          <Download size={15} />
                        </IconBtn>
                        <div className="relative" ref={rowMenu === row.id ? rowMenuRef : undefined}>
                          <IconBtn
                            label="Yana"
                            onClick={() => setRowMenu((id) => (id === row.id ? null : row.id))}
                          >
                            <MoreHorizontal size={15} />
                          </IconBtn>
                          {rowMenu === row.id && (
                            <div className="absolute right-0 z-20 mt-1 w-48 rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-slate-100">
                              {row.status === 'pending' && (
                                <MenuItem onClick={() => doConfirm(row)} icon={CheckCircle2}>
                                  Tasdiqlash
                                </MenuItem>
                              )}
                              {isStaff && row.status !== 'returned' && (
                                <MenuItem onClick={() => doReturn(row)} icon={RotateCcw} danger>
                                  Qaytarish
                                </MenuItem>
                              )}
                              <MenuItem
                                onClick={() => {
                                  setRowMenu(null)
                                  setLabelFor(row)
                                }}
                                icon={Printer}
                              >
                                QR chop etish
                              </MenuItem>
                              {isStaff && row.productId && (
                                <MenuItem
                                  onClick={() => {
                                    setRowMenu(null)
                                    navigate(`/products/${row.productId}`)
                                  }}
                                  icon={Package}
                                >
                                  Mahsulot
                                </MenuItem>
                              )}
                              {isStaff && row.employeeId && (
                                <MenuItem
                                  onClick={() => {
                                    setRowMenu(null)
                                    navigate(`/employees/${row.employeeId}`)
                                  }}
                                  icon={UserRound}
                                >
                                  Xodim
                                </MenuItem>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

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
          </>
        )}
      </div>

      <CreateAssignmentModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(assignment) => {
          setCreateOpen(false)
          navigate(`/assignments/${assignment.id}`)
        }}
      />

      <Modal open={Boolean(labelFor)} onClose={() => setLabelFor(null)} title="QR yorlig'i">
        {labelFor && (
          <AssignmentQrLabel
            assignment={labelFor}
            product={labelFor.product}
            employee={labelFor.employee}
            room={labelFor.room}
          />
        )}
      </Modal>
    </div>
  )
}

function AssignmentCard({ row, selected, onToggle, onView, onDownload }) {
  const file = fileMeta(row)
  return (
    <article className="p-4">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="mt-1.5 h-4 w-4 accent-brand-600"
          aria-label={`${row.product?.name || 'Biriktirma'} ni tanlash`}
        />
        <button type="button" onClick={onView} className="flex min-w-0 flex-1 items-start gap-3 text-left">
          <ProductThumb product={row.product} />
          <span className="min-w-0 flex-1">
            <span className="flex items-start justify-between gap-2">
              <span className="truncate font-semibold text-ink">{row.product?.name || '—'}</span>
              <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge>
            </span>
            <span className="mt-0.5 block text-[12px] text-muted">
              {row.assetTag} · {row.quantity} {row.product?.unit || 'dona'}
            </span>
            <span className="mt-2 flex items-center gap-2 text-[12px] text-slate-600">
              <FileGlyph kind={file.kind} />
              <span>
                <span className="block font-semibold text-ink">{file.title}</span>
                {file.size ? <span className="text-muted">{file.size}</span> : null}
              </span>
            </span>
            <span className="mt-2 block">
              <TargetCell row={row} />
            </span>
            <span className={cn('mt-2 block text-[12px] font-semibold', STATUS_DATE[row.status])}>
              {formatDate(row.assignedAt)} · {formatTime(row.assignedAt)}
            </span>
          </span>
        </button>
        <IconBtn label="Yuklab olish" onClick={onDownload}>
          <Download size={15} />
        </IconBtn>
      </div>
    </article>
  )
}

function TargetCell({ row }) {
  const target = assignmentTarget(row)
  if (target.kind === 'room') {
    return (
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
          <DoorOpen size={15} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-ink">{target.title}</p>
          <p className="truncate text-[12px] text-muted">{target.subtitle}</p>
        </div>
      </div>
    )
  }
  if (target.kind === 'employee') {
    const emp = row.employee
    return (
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={emp.fullName} color={colorFor(emp.fullName)} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-ink">{emp.fullName}</p>
          <p className="truncate text-[12px] text-muted">{emp.position || emp.department || '—'}</p>
        </div>
      </div>
    )
  }
  return <span className="text-sm text-muted">—</span>
}

function CreateAssignmentModal({ open, onClose, onCreated }) {
  const { data: products } = useProducts()
  const { data: employees } = useEmployees()
  const { data: rooms } = useRooms()
  const create = useCreateAssignment()
  const [targetType, setTargetType] = useState('employee')
  const [product, setProduct] = useState(null)
  const [employee, setEmployee] = useState(null)
  const [room, setRoom] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [date, setDate] = useState(todayInput)
  const [note, setNote] = useState('')
  const [documentUrl, setDocumentUrl] = useState(null)
  const [documentName, setDocumentName] = useState('')
  const [documentSize, setDocumentSize] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setTargetType('employee')
    setProduct(null)
    setEmployee(null)
    setRoom(null)
    setQuantity(1)
    setDate(todayInput())
    setNote('')
    setDocumentUrl(null)
    setDocumentName('')
    setDocumentSize(null)
    setError('')
  }, [open])

  const stock = product?.quantity ?? 0

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!product) return setError('Mahsulotni tanlang')
    if (targetType === 'employee' && !employee) return setError('Xodimni tanlang')
    if (targetType === 'room' && !room) return setError('Xonani tanlang yoki raqamini yozing')
    const qty = Number(quantity)
    if (!qty || qty < 1) return setError("Miqdor 1 dan kam bo'lmasin")
    if (qty > stock) return setError(`Omborda yetarli mahsulot yo'q (qoldiq: ${stock})`)
    try {
      const payload = {
        productId: product.id,
        targetType,
        quantity: qty,
        note: note.trim(),
        documentUrl,
        documentName: documentName || undefined,
        documentSize: documentSize || undefined,
        assignedAt: dateToIso(date),
        reason: 'assign',
      }
      if (targetType === 'employee') payload.employeeId = employee.id
      else if (room.id) payload.roomId = room.id
      else {
        payload.roomNumber = room.number
        payload.roomName = room.name
      }
      const assignment = await create.mutateAsync(payload)
      onCreated(assignment)
    } catch (e2) {
      setError(e2.message)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Yangi biriktirma" wide>
      <form onSubmit={submit} className="space-y-3.5">
        <div>
          <FormLbl required>Mahsulot</FormLbl>
          <ProductPicker products={products || []} value={product} onChange={setProduct} />
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
          {[
            { id: 'employee', label: 'Xodimga' },
            { id: 'room', label: 'Xonaga' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setTargetType(tab.id)
                setError('')
              }}
              className={cn(
                'rounded-xl px-3 py-2 text-sm font-semibold transition',
                targetType === tab.id ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-slate-800',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {targetType === 'employee' ? (
          <div>
            <FormLbl required>Xodim</FormLbl>
            <EmployeePicker employees={(employees || []).filter((e) => e.status !== 'terminated')} value={employee} onChange={setEmployee} />
          </div>
        ) : (
          <div>
            <FormLbl required>Xona</FormLbl>
            <RoomPicker rooms={rooms || []} value={room} onChange={setRoom} />
          </div>
        )}
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Miqdor" required>
            <input
              type="number"
              min="1"
              max={product ? stock : undefined}
              className={inputClass}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </Field>
          <Field label="Sana" required>
            <div className="relative">
              <input type="date" className={cn(inputClass, 'date-input relative pr-10')} value={date} onChange={(e) => setDate(e.target.value)} required />
              <CalendarDays size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </Field>
        </div>
        {product && (
          <p className="text-xs font-medium text-muted">
            Mavjud qoldiq: {stock} {product.unit}
          </p>
        )}
        <Field label="Izoh (ixtiyoriy)">
          <textarea
            className={cn(inputClass, 'min-h-[80px] resize-y')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={targetType === 'room' ? 'Masalan: 201-xona, o\'quv stoli' : "Qo'shimcha ma'lumot..."}
          />
        </Field>
        <Field label="Fayl biriktirish (ixtiyoriy)">
          <FileDrop
            value={documentUrl}
            onChange={(url, meta) => {
              setDocumentUrl(url)
              setDocumentName(url ? meta?.name || '' : '')
              setDocumentSize(url ? meta?.size || null : null)
            }}
          />
        </Field>
        <ErrorNote>{error}</ErrorNote>
        <PrimaryBtn type="submit" disabled={create.isPending} className="w-full">
          {create.isPending ? 'Saqlanmoqda...' : 'Biriktirish'}
        </PrimaryBtn>
      </form>
    </Modal>
  )
}

function FormLbl({ children, required }) {
  return (
    <span className="mb-1.5 block text-sm font-medium text-slate-600">
      {children}
      {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
    </span>
  )
}

function ProductPicker({ products, value, onChange }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState(value?.name || '')
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (value?.name && !open) setQ(value.name)
  }, [value, open])

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    const source = products || []
    if (!s || value?.name === q) return source.slice(0, 40)
    return source.filter((p) => p.name.toLowerCase().includes(s) || String(p.barcode || '').includes(s)).slice(0, 40)
  }, [products, q, value])

  return (
    <div className="relative" ref={ref}>
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border bg-white px-3.5 py-2.5 transition',
          open ? 'border-brand-500 ring-4 ring-brand-50' : 'border-slate-200',
        )}
      >
        <Search size={16} className="shrink-0 text-slate-400" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
            if (value) onChange(null)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Mahsulotni qidiring..."
          className="w-full bg-transparent text-sm outline-none"
        />
        <ChevronDown size={16} className={cn('shrink-0 text-slate-400 transition', open && 'rotate-180')} />
      </div>
      {open && (
        <ul className="absolute z-50 mt-1.5 max-h-64 w-full overflow-y-auto rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-slate-100">
          {list.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(p)
                  setQ(p.name)
                  setOpen(false)
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span className="min-w-0 truncate font-medium">{p.name}</span>
                <Badge tone={p.quantity === 0 ? 'red' : 'slate'}>
                  {p.quantity} {p.unit}
                </Badge>
              </button>
            </li>
          ))}
          {!list.length && <li className="px-3 py-3 text-center text-sm text-muted">Topilmadi</li>}
        </ul>
      )}
    </div>
  )
}

function EmployeePicker({ employees, value, onChange }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState(value?.fullName || '')
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (value?.fullName && !open) setQ(value.fullName)
  }, [value, open])

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    const source = employees || []
    if (!s || value?.fullName === q) return source.slice(0, 40)
    return source.filter(
      (e) =>
        e.fullName.toLowerCase().includes(s) ||
        String(e.badgeCode || '').toLowerCase() === s ||
        String(e.department || '').toLowerCase().includes(s),
    )
  }, [employees, q, value])

  return (
    <div className="relative" ref={ref}>
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border bg-white px-3.5 py-2.5 transition',
          open ? 'border-brand-500 ring-4 ring-brand-50' : 'border-slate-200',
        )}
      >
        <UserRound size={16} className="shrink-0 text-slate-400" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
            if (value) onChange(null)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Xodimni qidiring..."
          className="w-full bg-transparent text-sm outline-none"
        />
        <ChevronDown size={16} className={cn('shrink-0 text-slate-400 transition', open && 'rotate-180')} />
      </div>
      {open && (
        <ul className="absolute z-50 mt-1.5 max-h-64 w-full overflow-y-auto rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-slate-100">
          {list.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(e)
                  setQ(e.fullName)
                  setOpen(false)
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span className="min-w-0 truncate font-medium">{e.fullName}</span>
                <span className="shrink-0 text-xs text-muted">{e.department}</span>
              </button>
            </li>
          ))}
          {!list.length && <li className="px-3 py-3 text-center text-sm text-muted">Topilmadi</li>}
        </ul>
      )}
    </div>
  )
}

function RoomPicker({ rooms, value, onChange }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState(value ? roomTitle(value) : '')
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (value && !open) setQ(roomTitle(value))
  }, [value, open])

  const typed = q.trim()
  const list = useMemo(() => {
    const s = typed.toLowerCase()
    const source = rooms || []
    if (!s || (value && roomTitle(value) === q)) return source.slice(0, 40)
    return source.filter(
      (r) =>
        String(r.number).toLowerCase().includes(s) ||
        String(r.name || '').toLowerCase().includes(s) ||
        String(r.building || '').toLowerCase().includes(s),
    )
  }, [rooms, typed, q, value])

  const exact = list.some((r) => String(r.number).toLowerCase() === typed.toLowerCase())
  const canCreate = Boolean(typed) && !exact && !(value && roomTitle(value) === q)

  return (
    <div className="relative" ref={ref}>
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border bg-white px-3.5 py-2.5 transition',
          open ? 'border-brand-500 ring-4 ring-brand-50' : 'border-slate-200',
        )}
      >
        <DoorOpen size={16} className="shrink-0 text-slate-400" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
            if (value) onChange(null)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Masalan: 201"
          className="w-full bg-transparent text-sm outline-none"
        />
        <ChevronDown size={16} className={cn('shrink-0 text-slate-400 transition', open && 'rotate-180')} />
      </div>
      {open && (
        <ul className="absolute z-50 mt-1.5 max-h-64 w-full overflow-y-auto rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-slate-100">
          {list.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(r)
                  setQ(roomTitle(r))
                  setOpen(false)
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span className="min-w-0 truncate font-medium">{roomTitle(r)}</span>
                <span className="shrink-0 text-xs text-muted">{r.building || `${r.number}-xona`}</span>
              </button>
            </li>
          ))}
          {canCreate && (
            <li>
              <button
                type="button"
                onClick={() => {
                  const created = { id: null, number: typed, name: `${typed}-xona` }
                  onChange(created)
                  setQ(created.name)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-brand-700 hover:bg-brand-50"
              >
                <Plus size={14} /> "{typed}" xonasini yaratish
              </button>
            </li>
          )}
          {!list.length && !canCreate && <li className="px-3 py-3 text-center text-sm text-muted">Topilmadi</li>}
        </ul>
      )}
    </div>
  )
}

function ProductThumb({ product, large }) {
  const box = large ? 'h-14 w-14' : 'h-12 w-12'
  if (product?.photoUrl) {
    return <img src={product.photoUrl} alt="" className={cn(box, 'shrink-0 rounded-xl object-cover ring-1 ring-slate-100')} />
  }
  const v = productVisual(product?.name)
  const Icon = v.Icon
  return (
    <span className={cn(box, 'grid shrink-0 place-items-center rounded-xl', v.bg, v.fg)}>
      <Icon size={large ? 22 : 20} />
    </span>
  )
}

function IconBtn({ children, onClick, label }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:border-brand-200 hover:bg-slate-50 hover:text-brand-600"
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

function MenuItem({ children, onClick, icon: Icon, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium hover:bg-slate-50',
        danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-600',
      )}
    >
      {Icon ? <Icon size={14} /> : null}
      {children}
    </button>
  )
}
