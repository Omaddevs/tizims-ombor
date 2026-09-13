import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowUpDown,
  Banknote,
  Boxes,
  Calendar,
  ChevronRight,
  CircleDot,
  ClipboardList,
  Clock,
  FileText,
  Hash,
  LayoutGrid,
  ListTree,
  PackageMinus,
  PackagePlus,
  Search,
  SlidersHorizontal,
  Tag,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  UserSquare2,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { useCategories, useEmployees, useProducts, useTransactions } from '../api/queries'
import { useCurrentUser } from '../store/useAuthStore'
import { Select } from './Select'
import { Avatar, Badge, cn, inputClass } from './ui'
import { formatDate, formatSum, reasonLabel } from '../lib/format'

const RECENT_KEY = 'search-recent-v1'
const MAX_RECENT = 8

const SUGGESTIONS = ['monitor', 'Omadbek', 'KIR-0001', 'kirim']

const ALL_TABS = [
  { id: 'all', label: 'Barchasi', icon: LayoutGrid },
  { id: 'products', label: 'Mahsulotlar', icon: Boxes, roles: ['admin', 'manager'] },
  { id: 'employees', label: 'Xodimlar', icon: UserSquare2, roles: ['admin', 'manager'] },
  { id: 'documents', label: 'Hujjatlar', icon: FileText, roles: ['admin', 'manager'] },
  { id: 'categories', label: 'Kategoriyalar', icon: ListTree, roles: ['admin', 'manager'] },
]

const FILTERS_BY_TAB = {
  all: ['category', 'direction', 'employee', 'status', 'date', 'price', 'qty', 'doc'],
  products: ['category', 'status', 'date', 'price', 'qty'],
  employees: ['employee', 'status', 'date'],
  documents: ['category', 'direction', 'employee', 'status', 'date', 'price', 'qty', 'doc'],
  categories: ['status'],
}

const TONE_BG = {
  brand: 'bg-brand-50 text-brand-600',
  green: 'bg-emerald-50 text-emerald-600',
  red: 'bg-rose-50 text-rose-500',
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
  slate: 'bg-slate-100 text-slate-500',
}

function loadRecent() {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY))
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

function saveRecent(list) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)))
  } catch {
    /* ignore quota / private mode */
  }
}

function productStatus(p) {
  if (p.quantity <= 0) return { id: 'out', label: 'Tugagan', tone: 'red' }
  if (p.quantity <= p.minStock) return { id: 'low', label: 'Kam qoldiq', tone: 'amber' }
  return { id: 'ok', label: 'Mavjud', tone: 'green' }
}

const EMPLOYEE_STATUS_LABEL = {
  active: { label: 'Faol', tone: 'green' },
  on_leave: { label: "Ta'tilda", tone: 'amber' },
  terminated: { label: "Ishdan bo'shagan", tone: 'red' },
}

const DOC_STATUS_LABEL = {
  completed: { label: 'Kirim qilingan', tone: 'green' },
  pending: { label: 'Tekshirilmoqda', tone: 'amber' },
  partial: { label: 'Qisman kirim', tone: 'amber' },
}

function docCode(t) {
  return `${t.type === 'in' ? 'KIR' : 'CHQ'}-${String(t.id).slice(-6).toUpperCase()}`
}

function recentTimeLabel(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const pad = (n) => String(n).padStart(2, '0')
  if (sameDay) return `Bugun, ${pad(d.getHours())}:${pad(d.getMinutes())}`
  return formatDate(iso)
}

function inDateRange(iso, from, to) {
  if (!from && !to) return true
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return false
  if (from && t < new Date(from).getTime()) return false
  if (to && t > new Date(`${to}T23:59:59`).getTime()) return false
  return true
}

function inNumRange(n, min, max) {
  if (min !== '' && min != null && n < Number(min)) return false
  if (max !== '' && max != null && n > Number(max)) return false
  return true
}

function formatIsoDate(iso) {
  if (!iso) return ''
  const [y, m, d] = String(iso).split('-')
  if (!y || !m || !d) return iso
  return `${d}.${m}.${y}`
}

const emptyFilters = {
  categoryId: '',
  direction: '',
  employeeId: '',
  status: '',
  dateFrom: '',
  dateTo: '',
  priceMin: '',
  priceMax: '',
  qtyMin: '',
  qtyMax: '',
  docNumber: '',
}

export default function SearchModal({ open, onClose, items }) {
  if (!open) return null
  return <SearchModalInner onClose={onClose} items={items} />
}

function SearchModalInner({ onClose, items }) {
  const me = useCurrentUser()
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const actionsRef = useRef([])
  const activeIndexRef = useRef(0)

  const tabs = useMemo(() => ALL_TABS.filter((t) => !t.roles || t.roles.includes(me?.role)), [me?.role])
  const richMode = tabs.length > 1

  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState(emptyFilters)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [recent, setRecent] = useState(() => loadRecent())
  const [activeIndex, setActiveIndex] = useState(0)

  const setFilter = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }))

  const { data: categories } = useCategories()
  const { data: products } = useProducts()
  const { data: employees } = useEmployees()
  const { data: transactions } = useTransactions()

  const q = query.trim().toLowerCase()
  const { categoryId, direction, employeeId, status, dateFrom, dateTo, priceMin, priceMax, qtyMin, qtyMax, docNumber } = filters

  const statusOptions = useMemo(() => {
    const base = [{ value: '', label: 'Barchasi' }]
    const product = [
      { value: 'ok', label: 'Mavjud' },
      { value: 'low', label: 'Kam qoldiq' },
      { value: 'out', label: 'Tugagan' },
    ]
    const employee = [
      { value: 'active', label: 'Faol' },
      { value: 'on_leave', label: "Ta'tilda" },
      { value: 'terminated', label: "Ishdan bo'shagan" },
    ]
    const category = [
      { value: 'active', label: 'Faol' },
      { value: 'archived', label: 'Arxivlangan' },
    ]
    const doc = [
      { value: 'completed', label: 'Kirim qilingan' },
      { value: 'pending', label: 'Tekshirilmoqda' },
      { value: 'partial', label: 'Qisman kirim' },
    ]
    if (tab === 'products') return [...base, ...product]
    if (tab === 'employees') return [...base, ...employee]
    if (tab === 'categories') return [...base, ...category]
    if (tab === 'documents') return [...base, ...doc]
    return [...base, ...product, ...employee.filter((o) => o.value !== 'active'), { value: 'archived', label: 'Arxivlangan' }, ...doc]
  }, [tab])

  useEffect(() => {
    if (!statusOptions.some((o) => o.value === status)) setFilter('status')('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const categoryOptions = useMemo(
    () => [{ value: '', label: 'Barcha kategoriyalar' }, ...(categories || []).map((c) => ({ value: c.id, label: c.name }))],
    [categories],
  )
  const employeeOptions = useMemo(
    () => [{ value: '', label: 'Barcha xodimlar' }, ...(employees || []).map((e) => ({ value: e.id, label: e.fullName }))],
    [employees],
  )
  const directionOptions = [
    { value: '', label: 'Barchasi' },
    { value: 'in', label: 'Kirim' },
    { value: 'out', label: 'Chiqim' },
  ]

  const catName = (id) => categories?.find((c) => c.id === id)?.name || ''
  const showFilter = (name) => (FILTERS_BY_TAB[tab] || FILTERS_BY_TAB.all).includes(name)

  const productResults = useMemo(() => {
    if (!richMode) return []
    return (products || [])
      .filter((p) => {
        if (q) {
          const hay = `${p.name} ${p.barcode} ${p.supplier || ''} ${catName(p.categoryId)}`.toLowerCase()
          if (!hay.includes(q)) return false
        }
        if (categoryId && p.categoryId !== categoryId) return false
        if (status && ['ok', 'low', 'out'].includes(status) && productStatus(p).id !== status) return false
        if (!inNumRange(Number(p.price) || 0, priceMin, priceMax)) return false
        if (!inNumRange(Number(p.quantity) || 0, qtyMin, qtyMax)) return false
        if (!inDateRange(p.createdAt, dateFrom, dateTo)) return false
        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [richMode, products, categories, q, categoryId, status, priceMin, priceMax, qtyMin, qtyMax, dateFrom, dateTo])

  const employeeResults = useMemo(() => {
    if (!richMode) return []
    return (employees || [])
      .filter((e) => {
        if (q) {
          const hay = `${e.fullName} ${e.position || ''} ${e.department || ''} ${e.phone || ''} ${e.badgeCode || ''}`.toLowerCase()
          if (!hay.includes(q)) return false
        }
        if (employeeId && e.id !== employeeId) return false
        if (status && ['active', 'on_leave', 'terminated'].includes(status) && (e.status || 'active') !== status) return false
        if (!inDateRange(e.hiredAt, dateFrom, dateTo)) return false
        return true
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
  }, [richMode, employees, q, employeeId, status, dateFrom, dateTo])

  const categoryResults = useMemo(() => {
    if (!richMode) return []
    return (categories || [])
      .filter((c) => {
        if (q) {
          const hay = `${c.name} ${c.description || ''}`.toLowerCase()
          if (!hay.includes(q)) return false
        }
        if (status === 'archived' && !c.archived) return false
        if (status === 'active' && c.archived) return false
        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [richMode, categories, q, status])

  const documentResults = useMemo(() => {
    if (!richMode) return []
    return (transactions || [])
      .filter((t) => {
        const code = docCode(t)
        if (q) {
          const hay = `${code} ${t.id} ${t.product?.name || ''} ${t.employee?.fullName || ''} ${t.note || ''} ${reasonLabel(t.reason)}`.toLowerCase()
          if (!hay.includes(q)) return false
        }
        if (categoryId && t.product?.categoryId !== categoryId) return false
        if (direction && t.type !== direction) return false
        if (employeeId && t.employeeId !== employeeId) return false
        if (status && ['completed', 'pending', 'partial'].includes(status) && (t.status || 'completed') !== status) return false
        if (!inDateRange(t.createdAt, dateFrom, dateTo)) return false
        const sum = (Number(t.quantity) || 0) * (Number(t.product?.price) || 0)
        if (!inNumRange(sum, priceMin, priceMax)) return false
        if (!inNumRange(Number(t.quantity) || 0, qtyMin, qtyMax)) return false
        if (docNumber.trim()) {
          const d = docNumber.trim().toLowerCase()
          if (!code.toLowerCase().includes(d) && !String(t.id).toLowerCase().includes(d)) return false
        }
        return true
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [richMode, transactions, q, categoryId, direction, employeeId, status, dateFrom, dateTo, priceMin, priceMax, qtyMin, qtyMax, docNumber])

  const simpleResults = useMemo(() => {
    if (richMode) return []
    const list = items || []
    if (!q) return list
    return list.filter((i) => i.label.toLowerCase().includes(q))
  }, [richMode, items, q])

  const filtersDirty = Object.values(filters).some(Boolean)
  const hasActiveQuery = richMode ? Boolean(q || filtersDirty || tab !== 'all') : Boolean(q)
  const isLoading = richMode && [products, employees, categories, transactions].some((d) => d === undefined)

  const cap = tab === 'all' ? 5 : 60
  const visibleProducts = tab === 'all' || tab === 'products' ? productResults.slice(0, cap) : []
  const visibleEmployees = tab === 'all' || tab === 'employees' ? employeeResults.slice(0, cap) : []
  const visibleDocuments = tab === 'all' || tab === 'documents' ? documentResults.slice(0, cap) : []
  const visibleCategories = tab === 'all' || tab === 'categories' ? categoryResults.slice(0, cap) : []

  const totalRich = productResults.length + employeeResults.length + documentResults.length + categoryResults.length
  const tabCounts = {
    all: totalRich,
    products: productResults.length,
    employees: employeeResults.length,
    documents: documentResults.length,
    categories: categoryResults.length,
  }

  const quickLinks = richMode
    ? [
        { label: 'Barcha mahsulotlar', hint: "Mahsulotlar ro'yxatini ko'rish", icon: Boxes, tone: 'brand', to: '/products' },
        { label: 'Barcha xodimlar', hint: "Xodimlar ro'yxatini ko'rish", icon: UserSquare2, tone: 'violet', to: '/employees' },
        { label: 'Kirim hujjatlari', hint: "Kirimlarni ko'rish", icon: PackagePlus, tone: 'green', to: '/transactions?type=in' },
        { label: 'Chiqim hujjatlari', hint: "Chiqimlarni ko'rish", icon: PackageMinus, tone: 'red', to: '/transactions?type=out' },
        { label: 'Hisobotlar', hint: "Statistikani ko'rish", icon: ClipboardList, tone: 'amber', to: '/reports' },
      ]
    : (items || []).slice(0, 5).map((i) => ({ label: i.label, hint: '', icon: i.icon || Users, tone: 'brand', to: i.to }))

  const resetFilters = () => setFilters(emptyFilters)

  const commit = (term) => {
    const t = (term ?? query).trim()
    if (!t) return
    const entry = { id: `r${Date.now()}`, term: t, type: tab, at: new Date().toISOString() }
    setRecent((prev) => {
      const next = [entry, ...prev.filter((r) => !(r.term.toLowerCase() === t.toLowerCase() && r.type === tab))].slice(0, MAX_RECENT)
      saveRecent(next)
      return next
    })
  }

  const removeRecent = (id) => {
    setRecent((prev) => {
      const next = prev.filter((r) => r.id !== id)
      saveRecent(next)
      return next
    })
  }

  const clearRecent = () => {
    setRecent([])
    saveRecent([])
  }

  const pickRecent = (r) => {
    setQuery(r.term)
    setTab(tabs.some((t) => t.id === r.type) ? r.type : 'all')
  }

  const goTo = (to) => {
    commit()
    onClose()
    navigate(to)
  }

  const tabLabel = (id) => ALL_TABS.find((t) => t.id === id)?.label || 'Barchasi'

  const filterChips = useMemo(() => {
    const chips = []
    if (categoryId) chips.push({ id: 'categoryId', label: catName(categoryId) || 'Kategoriya', clear: () => setFilter('categoryId')('') })
    if (direction) chips.push({ id: 'direction', label: direction === 'in' ? 'Kirim' : 'Chiqim', clear: () => setFilter('direction')('') })
    if (employeeId) {
      const name = employees?.find((e) => e.id === employeeId)?.fullName
      chips.push({ id: 'employeeId', label: name || 'Xodim', clear: () => setFilter('employeeId')('') })
    }
    if (status) {
      const lab = statusOptions.find((o) => o.value === status)?.label
      chips.push({ id: 'status', label: lab || status, clear: () => setFilter('status')('') })
    }
    if (dateFrom || dateTo) {
      chips.push({
        id: 'date',
        label: `${dateFrom ? formatIsoDate(dateFrom) : '…'} – ${dateTo ? formatIsoDate(dateTo) : '…'}`,
        clear: () => setFilters((f) => ({ ...f, dateFrom: '', dateTo: '' })),
      })
    }
    if (priceMin || priceMax) {
      chips.push({
        id: 'price',
        label: `${priceMin || '0'} – ${priceMax || '∞'} so'm`,
        clear: () => setFilters((f) => ({ ...f, priceMin: '', priceMax: '' })),
      })
    }
    if (qtyMin || qtyMax) {
      chips.push({
        id: 'qty',
        label: `${qtyMin || '0'} – ${qtyMax || '∞'} dona`,
        clear: () => setFilters((f) => ({ ...f, qtyMin: '', qtyMax: '' })),
      })
    }
    if (docNumber.trim()) chips.push({ id: 'docNumber', label: docNumber.trim(), clear: () => setFilter('docNumber')('') })
    return chips
  }, [categoryId, direction, employeeId, status, dateFrom, dateTo, priceMin, priceMax, qtyMin, qtyMax, docNumber, employees, statusOptions, categories])

  const navCount = !hasActiveQuery
    ? quickLinks.length + recent.length
    : richMode
      ? visibleProducts.length + visibleEmployees.length + visibleDocuments.length + visibleCategories.length
      : simpleResults.length

  actionsRef.current = !hasActiveQuery
    ? [...quickLinks.map((l) => () => goTo(l.to)), ...recent.map((r) => () => pickRecent(r))]
    : richMode
      ? [
          ...visibleProducts.map((p) => () => goTo(`/products/${p.id}`)),
          ...visibleEmployees.map((e) => () => goTo(`/employees/${e.id}`)),
          ...visibleDocuments.map((t) => () => goTo(`/transactions?type=${t.type}`)),
          ...visibleCategories.map(() => () => goTo('/categories')),
        ]
      : simpleResults.map((item) => () => goTo(item.to))
  activeIndexRef.current = activeIndex

  useEffect(() => {
    setActiveIndex(0)
  }, [q, tab])

  useEffect(() => {
    setActiveIndex((i) => (navCount === 0 ? 0 : Math.min(i, navCount - 1)))
  }, [navCount])

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-search-hit="${activeIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      const tag = e.target?.tagName
      const inField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      const isSearch = e.target === inputRef.current
      if (inField && !isSearch) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => (navCount ? (i + 1) % navCount : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => (navCount ? (i - 1 + navCount) % navCount : 0))
      } else if (e.key === 'Enter') {
        if (!isSearch && inField) return
        e.preventDefault()
        const run = actionsRef.current[activeIndexRef.current]
        if (run) run()
        else commit()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, navCount])

  const employeeStart = visibleProducts.length
  const documentStart = employeeStart + visibleEmployees.length
  const categoryStart = documentStart + visibleDocuments.length

  return (
    <div className="fixed inset-0 z-[60] grid place-items-start overflow-y-auto p-3 pt-[8vh] sm:p-6 sm:pt-[10vh]">
      <button type="button" className="fixed inset-0 bg-slate-900/45 backdrop-blur-[3px]" onClick={onClose} aria-label="Yopish" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-modal-title"
        className="search-modal-panel relative z-10 mx-auto flex w-full max-w-[680px] flex-col rounded-2xl bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)] ring-1 ring-slate-900/5"
        style={{ maxHeight: 'min(720px, calc(100dvh - 6rem))' }}
      >
        <h2 id="search-modal-title" className="sr-only">
          Qidiruv
        </h2>
        <div className="shrink-0 border-b border-slate-100">
          <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
            <Search size={20} className="shrink-0 text-brand-600" />
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Mahsulot, xodim, hujjat yoki kategoriya..."
              className="w-full bg-transparent text-[16px] font-medium text-ink outline-none placeholder:font-normal placeholder:text-slate-400 sm:text-[17px]"
              aria-label="Qidiruv"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="So'rovni tozalash"
              >
                <X size={14} />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="hidden shrink-0 items-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-400 sm:inline-flex"
            >
              Esc
            </button>
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 sm:hidden"
              aria-label="Yopish"
            >
              <X size={18} />
            </button>
          </div>

          {richMode && (
            <div className="flex gap-1 overflow-x-auto px-4 pb-3 sm:px-5">
              {tabs.map((t) => {
                const Icon = t.icon
                const on = tab === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition',
                      on
                        ? 'bg-brand-600 text-white shadow-sm'
                        : tabCounts[t.id] === 0 && hasActiveQuery
                          ? 'bg-slate-100 text-slate-400'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800',
                    )}
                  >
                    <Icon size={14} />
                    {t.label}
                    {hasActiveQuery && (
                      <span className={cn('tabular-nums text-[11px]', on ? 'text-white/80' : 'text-slate-400')}>
                        {tabCounts[t.id]}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {richMode && (
            <div className="flex flex-wrap items-center gap-2 px-4 pb-3 sm:px-5">
              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition',
                  filtersOpen || filtersDirty
                    ? 'bg-brand-100 text-brand-800 ring-1 ring-brand-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                <SlidersHorizontal size={14} />
                Filtrlar
                {filterChips.length > 0 && (
                  <span className="grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                    {filterChips.length}
                  </span>
                )}
              </button>
              {filterChips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={chip.clear}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
                >
                  {chip.label}
                  <X size={11} />
                </button>
              ))}
              {filtersDirty && (
                <button type="button" onClick={resetFilters} className="text-[12px] font-semibold text-brand-600 hover:text-brand-700">
                  Tozalash
                </button>
              )}
              {hasActiveQuery && !isLoading && totalRich > 0 && (
                <span className="ml-auto text-[12px] font-medium tabular-nums text-slate-400">{totalRich} ta natija</span>
              )}
            </div>
          )}

          {richMode && filtersOpen && (
            <div className="mx-4 mb-3 grid gap-3 rounded-2xl bg-slate-50 p-3 sm:mx-5 sm:grid-cols-2 lg:grid-cols-3">
              {showFilter('category') && (
                <FilterField icon={Tag} label="Kategoriya">
                  <Select value={categoryId} onChange={setFilter('categoryId')} options={categoryOptions} />
                </FilterField>
              )}
              {showFilter('direction') && (
                <FilterField icon={ArrowUpDown} label="Kirim / Chiqim">
                  <Select value={direction} onChange={setFilter('direction')} options={directionOptions} />
                </FilterField>
              )}
              {showFilter('employee') && (
                <FilterField icon={User} label="Xodim">
                  <Select value={employeeId} onChange={setFilter('employeeId')} options={employeeOptions} />
                </FilterField>
              )}
              {showFilter('status') && (
                <FilterField icon={CircleDot} label="Holat">
                  <Select value={status} onChange={setFilter('status')} options={statusOptions} />
                </FilterField>
              )}
              {showFilter('date') && (
                <FilterField icon={Calendar} label="Sana oralig'i">
                  <div className="flex items-center gap-1.5">
                    <DateField value={dateFrom} onChange={setFilter('dateFrom')} placeholder="Dan" />
                    <span className="text-slate-300">–</span>
                    <DateField value={dateTo} onChange={setFilter('dateTo')} placeholder="Gacha" />
                  </div>
                </FilterField>
              )}
              {showFilter('price') && (
                <FilterField icon={Banknote} label="Narx (so'm)">
                  <RangeInputs min={priceMin} max={priceMax} onMin={setFilter('priceMin')} onMax={setFilter('priceMax')} />
                </FilterField>
              )}
              {showFilter('qty') && (
                <FilterField icon={Hash} label="Miqdor">
                  <RangeInputs min={qtyMin} max={qtyMax} onMin={setFilter('qtyMin')} onMax={setFilter('qtyMax')} />
                </FilterField>
              )}
              {showFilter('doc') && (
                <FilterField icon={FileText} label="Hujjat raqami">
                  <input
                    value={docNumber}
                    onChange={(e) => setFilter('docNumber')(e.target.value)}
                    placeholder="KIR-0001, CHQ-0001"
                    className={cn(inputClass, 'px-2.5 py-2 text-[13px]')}
                  />
                </FilterField>
              )}
            </div>
          )}
        </div>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto scrollbar-thin" role="listbox" aria-label="Qidiruv natijalari">
          <div className="px-3 py-3 sm:px-4">
            {!hasActiveQuery ? (
              <IdlePane
                recent={recent}
                quickLinks={quickLinks}
                activeIndex={activeIndex}
                setActiveIndex={setActiveIndex}
                pickRecent={pickRecent}
                removeRecent={removeRecent}
                clearRecent={clearRecent}
                tabLabel={tabLabel}
                goTo={goTo}
                onSuggest={setQuery}
              />
            ) : isLoading ? (
              <div className="space-y-2 px-2 py-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            ) : richMode ? (
              <RichResults
                tab={tab}
                setTab={setTab}
                totalRich={totalRich}
                productHits={visibleProducts}
                employeeHits={visibleEmployees}
                documentHits={visibleDocuments}
                categoryHits={visibleCategories}
                productTotal={productResults.length}
                employeeTotal={employeeResults.length}
                documentTotal={documentResults.length}
                categoryTotal={categoryResults.length}
                catName={catName}
                goTo={goTo}
                activeIndex={activeIndex}
                setActiveIndex={setActiveIndex}
                employeeStart={employeeStart}
                documentStart={documentStart}
                categoryStart={categoryStart}
              />
            ) : (
              <SimpleResults
                results={simpleResults}
                onPick={goTo}
                activeIndex={activeIndex}
                setActiveIndex={setActiveIndex}
              />
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/80 px-4 py-2.5 text-[11px] font-medium text-slate-400 sm:px-5">
          <span className="inline-flex items-center gap-2">
            <span className="hidden items-center gap-1 sm:inline-flex">
              <span className="kbd">↑</span>
              <span className="kbd">↓</span>
              tanlash
            </span>
            <span className="hidden items-center gap-1 sm:inline-flex">
              <span className="kbd">Enter</span>
              ochish
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="kbd">Esc</span>
              yopish
            </span>
          </span>
          <span className="hidden sm:inline">Natijalar real vaqtda yangilanadi</span>
        </div>
      </div>
    </div>
  )
}

function IdlePane({
  recent,
  quickLinks,
  activeIndex,
  setActiveIndex,
  pickRecent,
  removeRecent,
  clearRecent,
  tabLabel,
  goTo,
  onSuggest,
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 px-1.5 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-slate-400">
          <Zap size={13} className="text-brand-500" /> Tezkor havolalar
        </p>
        <div className="grid gap-1 sm:grid-cols-2">
          {quickLinks.map((l, i) => {
            const Icon = l.icon
            const index = i
            const on = activeIndex === index
            return (
              <button
                key={l.label}
                type="button"
                data-search-hit={index}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => goTo(l.to)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition',
                  on ? 'bg-brand-50' : 'hover:bg-slate-50',
                )}
              >
                <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', TONE_BG[l.tone] || TONE_BG.brand)}>
                  <Icon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold text-ink">{l.label}</span>
                  {l.hint && <span className="block truncate text-[11px] text-slate-400">{l.hint}</span>}
                </span>
                <ChevronRight size={14} className={cn('shrink-0 text-slate-300', on ? 'opacity-100' : 'opacity-0')} />
              </button>
            )
          })}
        </div>
      </div>

      {recent.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center justify-between px-1.5">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-slate-400">
              <Clock size={13} /> So'nggi qidiruvlar
            </p>
            <button type="button" onClick={clearRecent} className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-rose-500">
              <Trash2 size={11} /> Tozalash
            </button>
          </div>
          <div className="space-y-0.5">
            {recent.map((r, i) => {
              const index = quickLinks.length + i
              const on = activeIndex === index
              return (
                <div
                  key={r.id}
                  data-search-hit={index}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn('group flex items-center gap-2 rounded-xl px-2 py-1.5', on ? 'bg-brand-50' : 'hover:bg-slate-50')}
                >
                  <button type="button" onClick={() => pickRecent(r)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-400">
                      <Clock size={13} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-ink">{r.term}</span>
                      <span className="block truncate text-[11px] text-slate-400">{tabLabel(r.type)}</span>
                    </span>
                  </button>
                  <span className="shrink-0 text-[11px] text-slate-400">{recentTimeLabel(r.at)}</span>
                  <button
                    type="button"
                    onClick={() => removeRecent(r.id)}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-slate-300 opacity-0 transition hover:bg-slate-200 hover:text-slate-600 group-hover:opacity-100"
                    aria-label="O'chirish"
                  >
                    <X size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 px-1.5">
        <span className="text-[11px] font-medium text-slate-400">Masalan:</span>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSuggest(s)}
            className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-100 transition hover:bg-brand-50 hover:text-brand-700 hover:ring-brand-100"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

function FilterField({ icon: Icon, label, children }) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-slate-500">
        <Icon size={13} className="text-slate-400" /> {label}
      </p>
      {children}
    </div>
  )
}

function DateField({ value, onChange, placeholder }) {
  return (
    <label className="relative flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-[13px] outline-none transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-50">
      <Calendar size={13} className="shrink-0 text-slate-400" />
      <span className={cn('min-w-0 flex-1 truncate', value ? 'font-medium text-ink' : 'text-slate-400')}>
        {value ? formatIsoDate(value) : placeholder}
      </span>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="date-input absolute inset-0 cursor-pointer opacity-0" />
    </label>
  )
}

function RangeInputs({ min, max, onMin, onMax }) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min="0"
        placeholder="Min"
        value={min}
        onChange={(e) => onMin(e.target.value)}
        className={cn(inputClass, 'px-2.5 py-2 text-[13px]')}
      />
      <span className="text-slate-300">–</span>
      <input
        type="number"
        min="0"
        placeholder="Max"
        value={max}
        onChange={(e) => onMax(e.target.value)}
        className={cn(inputClass, 'px-2.5 py-2 text-[13px]')}
      />
    </div>
  )
}

function ResultRow({ icon: Icon, tone = 'slate', title, meta, badge, right, onClick, avatar, active, hitIndex, onHover }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      data-search-hit={hitIndex}
      onMouseEnter={() => onHover?.(hitIndex)}
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition',
        active ? 'bg-brand-50' : 'hover:bg-slate-50',
      )}
    >
      {avatar || (
        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', TONE_BG[tone] || TONE_BG.slate)}>
          <Icon size={16} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-semibold text-ink">{title}</span>
        {meta && <span className="block truncate text-[11.5px] text-slate-400">{meta}</span>}
      </span>
      {right && <span className="shrink-0 text-xs font-semibold text-slate-500">{right}</span>}
      {badge}
      <ChevronRight size={14} className={cn('shrink-0 text-slate-300', active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')} />
    </button>
  )
}

function ResultGroup({ label, count, children }) {
  if (!count) return null
  return (
    <div>
      <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label} · {count}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function RichResults({
  tab,
  setTab,
  totalRich,
  productHits,
  employeeHits,
  documentHits,
  categoryHits,
  productTotal,
  employeeTotal,
  documentTotal,
  categoryTotal,
  catName,
  goTo,
  activeIndex,
  setActiveIndex,
  employeeStart,
  documentStart,
  categoryStart,
}) {
  if (!totalRich) {
    return (
      <div className="flex flex-col items-center gap-1.5 px-4 py-12 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-50 text-slate-300">
          <Search size={22} />
        </div>
        <p className="text-sm font-semibold text-slate-600">Hech narsa topilmadi</p>
        <p className="text-xs text-slate-400">Boshqa so'z yozing yoki filtrlarni yengillashtiring.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {(tab === 'all' || tab === 'products') && (
        <ResultGroup label="Mahsulotlar" count={productTotal}>
          {productHits.map((p, i) => {
            const st = productStatus(p)
            const hitIndex = i
            return (
              <ResultRow
                key={p.id}
                hitIndex={hitIndex}
                active={activeIndex === hitIndex}
                onHover={setActiveIndex}
                icon={Boxes}
                tone="brand"
                title={p.name}
                meta={`${catName(p.categoryId) || 'Kategoriyasiz'} · ${p.barcode} · ${p.quantity} ${p.unit}`}
                right={formatSum(p.price)}
                badge={<Badge tone={st.tone}>{st.label}</Badge>}
                onClick={() => goTo(`/products/${p.id}`)}
              />
            )
          })}
          {tab === 'all' && productTotal > productHits.length && (
            <button type="button" onClick={() => setTab('products')} className="w-full rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-brand-600 hover:bg-slate-50">
              va yana {productTotal - productHits.length} ta · Mahsulotlar
            </button>
          )}
        </ResultGroup>
      )}

      {(tab === 'all' || tab === 'employees') && (
        <ResultGroup label="Xodimlar" count={employeeTotal}>
          {employeeHits.map((e, i) => {
            const st = EMPLOYEE_STATUS_LABEL[e.status] || EMPLOYEE_STATUS_LABEL.active
            const hitIndex = employeeStart + i
            return (
              <ResultRow
                key={e.id}
                hitIndex={hitIndex}
                active={activeIndex === hitIndex}
                onHover={setActiveIndex}
                avatar={<Avatar name={e.fullName} size="sm" />}
                title={e.fullName}
                meta={`${e.department || ''}${e.position ? ' · ' + e.position : ''}${e.phone ? ' · ' + e.phone : ''}`}
                badge={<Badge tone={st.tone}>{st.label}</Badge>}
                onClick={() => goTo(`/employees/${e.id}`)}
              />
            )
          })}
          {tab === 'all' && employeeTotal > employeeHits.length && (
            <button type="button" onClick={() => setTab('employees')} className="w-full rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-brand-600 hover:bg-slate-50">
              va yana {employeeTotal - employeeHits.length} ta · Xodimlar
            </button>
          )}
        </ResultGroup>
      )}

      {(tab === 'all' || tab === 'documents') && (
        <ResultGroup label="Hujjatlar" count={documentTotal}>
          {documentHits.map((t, i) => {
            const st = DOC_STATUS_LABEL[t.status]
            const hitIndex = documentStart + i
            return (
              <ResultRow
                key={t.id}
                hitIndex={hitIndex}
                active={activeIndex === hitIndex}
                onHover={setActiveIndex}
                icon={t.type === 'in' ? TrendingUp : TrendingDown}
                tone={t.type === 'in' ? 'green' : 'red'}
                title={`${docCode(t)} · ${t.product?.name || 'Mahsulot'}`}
                meta={`${t.type === 'in' ? 'Kirim' : 'Chiqim'}${t.employee?.fullName ? ' · ' + t.employee.fullName : ''} · ${formatDate(t.createdAt, true)}`}
                right={`${t.quantity} ${t.product?.unit || ''}`}
                badge={st ? <Badge tone={st.tone}>{st.label}</Badge> : null}
                onClick={() => goTo(`/transactions?type=${t.type}`)}
              />
            )
          })}
          {tab === 'all' && documentTotal > documentHits.length && (
            <button type="button" onClick={() => setTab('documents')} className="w-full rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-brand-600 hover:bg-slate-50">
              va yana {documentTotal - documentHits.length} ta · Hujjatlar
            </button>
          )}
        </ResultGroup>
      )}

      {(tab === 'all' || tab === 'categories') && (
        <ResultGroup label="Kategoriyalar" count={categoryTotal}>
          {categoryHits.map((c, i) => {
            const hitIndex = categoryStart + i
            return (
              <ResultRow
                key={c.id}
                hitIndex={hitIndex}
                active={activeIndex === hitIndex}
                onHover={setActiveIndex}
                icon={ListTree}
                tone="violet"
                title={c.name}
                meta={c.description || undefined}
                badge={<Badge tone={c.archived ? 'slate' : 'green'}>{c.archived ? 'Arxivlangan' : 'Faol'}</Badge>}
                onClick={() => goTo('/categories')}
              />
            )
          })}
          {tab === 'all' && categoryTotal > categoryHits.length && (
            <button type="button" onClick={() => setTab('categories')} className="w-full rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-brand-600 hover:bg-slate-50">
              va yana {categoryTotal - categoryHits.length} ta · Kategoriyalar
            </button>
          )}
        </ResultGroup>
      )}
    </div>
  )
}

function SimpleResults({ results, onPick, activeIndex, setActiveIndex }) {
  if (!results.length) {
    return (
      <div className="flex flex-col items-center gap-1.5 px-4 py-12 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-50 text-slate-300">
          <Search size={22} />
        </div>
        <p className="text-sm font-semibold text-slate-600">Hech narsa topilmadi</p>
      </div>
    )
  }
  return (
    <div className="space-y-0.5">
      {results.map((item, i) => {
        const Icon = item.icon || Users
        return (
          <ResultRow
            key={item.to}
            hitIndex={i}
            active={activeIndex === i}
            onHover={setActiveIndex}
            icon={Icon}
            tone="brand"
            title={item.label}
            onClick={() => onPick(item.to)}
          />
        )
      })}
    </div>
  )
}
