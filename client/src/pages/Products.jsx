import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  Barcode,
  Check,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  Eye,
  ImagePlus,
  LayoutGrid,
  LayoutList,
  Loader2,
  MoreHorizontal,
  Package,
  PackageCheck,
  PackageX,
  Pencil,
  Plus,
  Printer,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
} from 'lucide-react'
import {
  useCategories,
  useCreateProduct,
  useDeleteProduct,
  useImportProducts,
  useProducts,
  useUpdateProduct,
  useUploadDocument,
} from '../api/queries'
import { useCurrentUser } from '../store/useAuthStore'
import {
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
import { ProductBarcodeLabel } from '../components/QrLabel'
import { formatSum } from '../lib/format'
import { exportRowsToExcel } from '../lib/excel'
import * as XLSX from 'xlsx'

const PAGE_SIZES = [
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
]

const PRICE_RANGES = [
  { value: '', label: 'Narx oralig\'i' },
  { value: '0-100000', label: '0 — 100 000' },
  { value: '100000-1000000', label: '100 ming — 1 mln' },
  { value: '1000000-5000000', label: '1 — 5 mln' },
  { value: '5000000-', label: '5 mln+' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'Barcha holatlar' },
  { value: 'ok', label: 'Mavjud' },
  { value: 'low', label: 'Kam qoldiq' },
  { value: 'out', label: 'Tugagan' },
]

const COLUMNS = [
  { key: 'photo', label: 'Rasm' },
  { key: 'name', label: 'Nomi', locked: true },
  { key: 'category', label: 'Kategoriya' },
  { key: 'barcode', label: 'Shtrix-kod' },
  { key: 'qty', label: 'Qoldiq' },
  { key: 'price', label: 'Narxi' },
  { key: 'supplier', label: 'Yetkazib beruvchi' },
  { key: 'status', label: 'Holat' },
  { key: 'actions', label: 'Amallar' },
]

function stockStatus(p) {
  if (p.quantity <= 0) return { id: 'out', label: 'Tugagan', tone: 'red', qtyClass: 'text-rose-600' }
  if (p.quantity <= p.minStock) return { id: 'low', label: 'Kam qoldiq', tone: 'yellow', qtyClass: 'text-amber-600' }
  return { id: 'ok', label: 'Mavjud', tone: 'green', qtyClass: 'text-emerald-600' }
}

function inPriceRange(price, range) {
  if (!range) return true
  const [a, b] = range.split('-')
  const min = a === '' ? -Infinity : Number(a)
  const max = b === '' ? Infinity : Number(b)
  return price >= min && price <= max
}

function matchesStatus(p, status) {
  if (!status) return true
  const id = stockStatus(p).id
  if (status === 'alert') return id === 'low' || id === 'out'
  return id === status
}

function visiblePages(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  if (page <= 4) return [1, 2, 3, 4, 5, '…', pages]
  if (page >= pages - 3) return [1, '…', pages - 4, pages - 3, pages - 2, pages - 1, pages]
  return [1, '…', page - 1, page, page + 1, '…', pages]
}

function exportProducts(rows, categories) {
  const catName = (id) => categories?.find((c) => c.id === id)?.name || '—'
  exportRowsToExcel(
    rows.map((p) => {
      const st = stockStatus(p)
      return {
        Nomi: p.name,
        Kategoriya: catName(p.categoryId),
        "O'lchov": p.unit,
        'Shtrix-kod': p.barcode,
        Miqdor: p.quantity,
        'Minimal zaxira': p.minStock,
        Narxi: p.price,
        'Yetkazib beruvchi': p.supplier || '—',
        Holat: st.label,
      }
    }),
    'Mahsulotlar',
    'mahsulotlar.xlsx',
  )
}

export default function Products() {
  const navigate = useNavigate()
  const me = useCurrentUser()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState(() => params.get('categoryId') || '')
  const [status, setStatus] = useState(params.get('lowStock') === '1' ? 'alert' : '')
  const [priceRange, setPriceRange] = useState('')
  const [supplierQ, setSupplierQ] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [view, setView] = useState('table')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [hiddenCols, setHiddenCols] = useState([])
  const [colsOpen, setColsOpen] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const [rowMenu, setRowMenu] = useState(null)
  const [open, setOpen] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [labelProduct, setLabelProduct] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importNote, setImportNote] = useState(null)

  const { data: categories } = useCategories()
  const { data: products, isLoading } = useProducts()
  const del = useDeleteProduct()

  const colsRef = useRef(null)
  const rowMenuRef = useRef(null)

  const catName = (id) => categories?.find((c) => c.id === id)?.name || '—'

  const list = products || []

  const stats = useMemo(() => {
    const total = list.length
    const ok = list.filter((p) => stockStatus(p).id === 'ok').length
    const low = list.filter((p) => stockStatus(p).id === 'low').length
    const out = list.filter((p) => stockStatus(p).id === 'out').length
    const monthAgo = Date.now() - 30 * 86400000
    const recent = list.filter((p) => new Date(p.createdAt).getTime() >= monthAgo).length
    const pct = (n) => (total ? `${Math.round((n / total) * 100)}%` : '0%')
    return {
      total,
      ok,
      low,
      out,
      recentDelta: recent ? `+${recent}` : '',
      okPct: pct(ok),
      lowPct: pct(low),
      outPct: pct(out),
    }
  }, [list])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const sup = supplierQ.trim().toLowerCase()
    return list.filter((p) => {
      const category = catName(p.categoryId)
      if (
        q &&
        !p.name.toLowerCase().includes(q) &&
        !String(p.barcode).includes(q) &&
        !category.toLowerCase().includes(q)
      ) {
        return false
      }
      if (categoryId && p.categoryId !== categoryId) return false
      if (!matchesStatus(p, status)) return false
      if (!inPriceRange(Number(p.price) || 0, priceRange)) return false
      if (sup && !(p.supplier || '').toLowerCase().includes(sup)) return false
      return true
    })
  }, [list, search, categoryId, status, priceRange, supplierQ, categories])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize) || 1)
  const safePage = Math.min(page, pages)
  const start = (safePage - 1) * pageSize
  const pageRows = filtered.slice(start, start + pageSize)
  const from = filtered.length ? start + 1 : 0
  const to = Math.min(start + pageSize, filtered.length)

  useEffect(() => {
    setPage(1)
  }, [search, categoryId, status, priceRange, supplierQ, pageSize])

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

  const clearLowStockParam = () => {
    if (params.get('lowStock')) {
      const next = new URLSearchParams(params)
      next.delete('lowStock')
      setParams(next, { replace: true })
    }
  }

  const applyStatus = (value) => {
    setStatus(value)
    clearLowStockParam()
  }

  const toggleStatus = (value) => {
    if (value === 'low' && (status === 'low' || status === 'alert')) applyStatus('')
    else applyStatus(status === value ? '' : value)
  }

  const filtersDirty = Boolean(search || categoryId || status || priceRange || supplierQ)

  const resetFilters = () => {
    setSearch('')
    setCategoryId('')
    setStatus('')
    setPriceRange('')
    setSupplierQ('')
    setFiltersOpen(false)
    clearLowStockParam()
  }

  const colOn = (key) => !hiddenCols.includes(key)
  const toggleCol = (key) => {
    setHiddenCols((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const allPageSelected = pageRows.length > 0 && pageRows.every((p) => selected.has(p.id))
  const toggleAllPage = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allPageSelected) pageRows.forEach((p) => next.delete(p.id))
      else pageRows.forEach((p) => next.add(p.id))
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
    const rows = selected.size ? filtered.filter((p) => selected.has(p.id)) : filtered
    exportProducts(rows, categories)
  }

  const remove = async (p) => {
    if (!confirm(`"${p.name}" mahsulotini o'chirmoqchimisiz?`)) return
    try {
      await del.mutateAsync(p.id)
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(p.id)
        return next
      })
    } catch (e) {
      alert(e.message)
    }
  }

  const categoryOptions = [
    { value: '', label: 'Barcha kategoriyalar' },
    ...(categories || []).map((c) => ({ value: c.id, label: c.name })),
  ]

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title="Mahsulotlar"
        crumbs={['Asosiy', 'Mahsulotlar']}
        subtitle="Barcha mahsulotlarni ko'ring, boshqaring va tahrirlang."
        action={
          <>
            <SecondaryBtn onClick={exportCurrent} disabled={!filtered.length}>
              <Download size={15} /> Excelga eksport
            </SecondaryBtn>
            <SecondaryBtn onClick={() => setImportOpen(true)}>
              <Upload size={15} /> Import
            </SecondaryBtn>
            <PrimaryBtn onClick={() => setOpen(true)}>
              <Plus size={16} /> Yangi mahsulot
            </PrimaryBtn>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Jami mahsulotlar"
          value={stats.total}
          delta={stats.recentDelta}
          sub="Barcha mahsulotlar soni"
          icon={Package}
          tone="brand"
          onClick={() => applyStatus('')}
        />
        <KpiCard
          title="Omborda mavjud"
          value={stats.ok}
          delta={stats.okPct}
          sub="Zaxirasi yetarli mahsulotlar"
          icon={PackageCheck}
          tone="green"
          onClick={() => toggleStatus('ok')}
          active={status === 'ok'}
        />
        <KpiCard
          title="Kam qoldiq"
          value={stats.low}
          delta={stats.lowPct}
          sub="Zaxirasi kam mahsulotlar"
          icon={AlertTriangle}
          tone="amber"
          onClick={() => toggleStatus('low')}
          active={status === 'low' || status === 'alert'}
        />
        <KpiCard
          title="Tugagan mahsulotlar"
          value={stats.out}
          delta={stats.outPct}
          sub="Omborda mavjud emas"
          icon={PackageX}
          tone="red"
          onClick={() => toggleStatus('out')}
          active={status === 'out'}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className={searchWrapClass}>
          <Search size={16} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Mahsulot nomi, shtrix-kod yoki kategoriya bo'yicha qidirish..."
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <Select value={categoryId} onChange={setCategoryId} options={categoryOptions} className="w-52" />
        <Select value={status === 'alert' ? 'low' : status} onChange={applyStatus} options={STATUS_OPTIONS} className="w-44" />
        <Select value={priceRange} onChange={setPriceRange} options={PRICE_RANGES} className="w-48" />
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
          <div className="min-w-[220px] flex-1">
            <Field label="Yetkazib beruvchi">
              <input
                className={inputClass}
                value={supplierQ}
                onChange={(e) => setSupplierQ(e.target.value)}
                placeholder="Masalan: NordTech"
              />
            </Field>
          </div>
        </div>
      )}

      {status === 'alert' && (
        <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm font-medium text-amber-700">
          Kam qolgan mahsulotlar ko'rsatilmoqda ·{' '}
          <button type="button" onClick={resetFilters} className="underline">
            filtrni tozalash
          </button>
        </p>
      )}

      {importNote && (
        <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700">{importNote}</p>
      )}

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
          <p className="text-[15px] font-semibold text-ink">
            Mahsulotlar ro'yxati{' '}
            <span className="font-medium text-muted">({filtered.length} ta)</span>
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
          <EmptyState title="Mahsulot topilmadi" hint="Qidiruv yoki filtrlarni o'zgartirib ko'ring." />
        )}

        {!isLoading && filtered.length > 0 && view === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
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
                  {colOn('photo') && <th className="px-3 py-3.5">Rasm</th>}
                  {colOn('name') && <th className="px-3 py-3.5">Nomi</th>}
                  {colOn('category') && <th className="px-3 py-3.5">Kategoriya</th>}
                  {colOn('barcode') && <th className="px-3 py-3.5">Shtrix-kod</th>}
                  {colOn('qty') && <th className="px-3 py-3.5">Qoldiq</th>}
                  {colOn('price') && <th className="px-3 py-3.5">Narxi</th>}
                  {colOn('supplier') && <th className="px-3 py-3.5">Yetkazib beruvchi</th>}
                  {colOn('status') && <th className="px-3 py-3.5">Holat</th>}
                  {colOn('actions') && <th className="px-3 py-3.5 text-right">Amallar</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pageRows.map((row, i) => {
                  const st = stockStatus(row)
                  return (
                    <tr
                      key={row.id}
                      onClick={() => navigate(`/products/${row.id}`)}
                      className="cursor-pointer transition hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-3 sm:px-5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(row.id)}
                          onChange={() => toggleOne(row.id)}
                          className="h-4 w-4 accent-brand-600"
                          aria-label={`${row.name} ni tanlash`}
                        />
                      </td>
                      <td className="px-2 py-3 text-slate-400">{start + i + 1}</td>
                      {colOn('photo') && (
                        <td className="px-3 py-3">
                          <ProductThumb url={row.photoUrl} />
                        </td>
                      )}
                      {colOn('name') && (
                        <td className="max-w-[220px] px-3 py-3">
                          <p className="truncate font-semibold text-ink">{row.name}</p>
                        </td>
                      )}
                      {colOn('category') && (
                        <td className="px-3 py-3">
                          <span className="text-[13px] font-medium text-brand-600">{catName(row.categoryId)}</span>
                        </td>
                      )}
                      {colOn('barcode') && (
                        <td className="px-3 py-3">
                          <span className="font-mono text-xs text-slate-500">{row.barcode}</span>
                        </td>
                      )}
                      {colOn('qty') && (
                        <td className="px-3 py-3">
                          <span className={cn('text-[13px] font-semibold', st.qtyClass)}>
                            {row.quantity} {row.unit}
                          </span>
                        </td>
                      )}
                      {colOn('price') && <td className="whitespace-nowrap px-3 py-3 font-medium">{formatSum(row.price)}</td>}
                      {colOn('supplier') && (
                        <td className="max-w-[160px] truncate px-3 py-3 text-slate-600">{row.supplier || '—'}</td>
                      )}
                      {colOn('status') && (
                        <td className="px-3 py-3">
                          <Badge tone={st.tone}>{st.label}</Badge>
                        </td>
                      )}
                      {colOn('actions') && (
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-0.5">
                            <IconBtn label="Ko'rish" onClick={() => navigate(`/products/${row.id}`)}>
                              <Eye size={15} />
                            </IconBtn>
                            <IconBtn label="Tahrirlash" onClick={() => setEditProduct(row)}>
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
                                      setLabelProduct(row)
                                      setRowMenu(null)
                                    }}
                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-50"
                                  >
                                    <Printer size={14} /> Shtrix-kod
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
              const st = stockStatus(row)
              return (
                <article
                  key={row.id}
                  className="flex cursor-pointer flex-col rounded-2xl border border-slate-100 p-4 transition hover:bg-slate-50/80"
                  onClick={() => navigate(`/products/${row.id}`)}
                >
                  <div className="flex items-start gap-3">
                    <span onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleOne(row.id)}
                        className="mt-1 h-4 w-4 accent-brand-600"
                        aria-label={`${row.name} ni tanlash`}
                      />
                    </span>
                    <ProductThumb url={row.photoUrl} large />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{row.name}</p>
                      <p className="mt-0.5 text-[13px] font-medium text-brand-600">{catName(row.categoryId)}</p>
                      <p className="mt-1 font-mono text-[11px] text-slate-400">{row.barcode}</p>
                    </div>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className={cn('text-sm font-semibold', st.qtyClass)}>
                        {row.quantity} {row.unit}
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-ink">{formatSum(row.price)}</p>
                    </div>
                    <div className="flex" onClick={(e) => e.stopPropagation()}>
                      <IconBtn label="Ko'rish" onClick={() => navigate(`/products/${row.id}`)}>
                        <Eye size={15} />
                      </IconBtn>
                      <IconBtn label="Tahrirlash" onClick={() => setEditProduct(row)}>
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
                {from}–{to} dan {filtered.length} gacha
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

      <ProductModal open={open} onClose={() => setOpen(false)} categories={categories} />
      <ProductModal
        key={editProduct?.id || 'edit'}
        open={Boolean(editProduct)}
        onClose={() => setEditProduct(null)}
        categories={categories}
        product={editProduct}
      />
      <Modal open={Boolean(labelProduct)} onClose={() => setLabelProduct(null)} title="Shtrix-kod yorlig'i">
        {labelProduct && <ProductBarcodeLabel product={labelProduct} />}
      </Modal>
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onDone={(msg) => {
          setImportOpen(false)
          setImportNote(msg)
        }}
      />
    </div>
  )
}

function ProductThumb({ url, large }) {
  const box = large ? 'h-14 w-14' : 'h-10 w-10'
  if (url) {
    return <img src={url} alt="" className={cn(box, 'rounded-xl object-cover ring-1 ring-slate-100')} />
  }
  return (
    <span className={cn(box, 'grid shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-400')}>
      <Package size={large ? 20 : 16} />
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

function ProductModal({ open, onClose, categories, product }) {
  const create = useCreateProduct()
  const update = useUpdateProduct()
  const isEdit = Boolean(product)
  const [form, setForm] = useState(() => emptyForm(product))
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setForm(emptyForm(product))
      setError('')
    }
  }, [open, product])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const pending = create.isPending || update.isPending

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const payload = {
      ...form,
      quantity: Number(form.quantity) || 0,
      minStock: Number(form.minStock) || 0,
      price: Number(form.price) || 0,
    }
    try {
      if (isEdit) {
        const { quantity: _quantity, ...rest } = payload
        await update.mutateAsync({ id: product.id, ...rest })
      } else {
        await create.mutateAsync(payload)
      }
      setForm(emptyForm())
      onClose()
    } catch (e2) {
      setError(e2.message)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Mahsulotni tahrirlash' : "Yangi mahsulot qo'shish"} wide>
      <form onSubmit={submit} className="space-y-3.5">
        <ImagePick value={form.photoUrl} onChange={(photoUrl) => setForm((f) => ({ ...f, photoUrl }))} />
        <Field label="Nomi">
          <input className={inputClass} value={form.name} onChange={set('name')} required />
        </Field>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Kategoriya">
            <Select
              value={form.categoryId}
              onChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
              options={(categories || []).map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Tanlang"
            />
          </Field>
          <Field label="O'lchov birligi">
            <input className={inputClass} value={form.unit} onChange={set('unit')} placeholder="dona, kg, metr..." required />
          </Field>
        </div>
        {!isEdit && (
          <Field label="Shtrix-kod" hint="Bo'sh qoldirsangiz avtomatik generatsiya qilinadi">
            <div className="flex items-center gap-2">
              <Barcode size={16} className="text-slate-400" />
              <input className={inputClass} value={form.barcode} onChange={set('barcode')} placeholder="Avtomatik" />
            </div>
          </Field>
        )}
        <div className={cn('grid gap-3.5', isEdit ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
          {!isEdit && (
            <Field label="Boshlang'ich miqdor">
              <input type="number" min="0" className={inputClass} value={form.quantity} onChange={set('quantity')} />
            </Field>
          )}
          <Field label="Minimal zaxira">
            <input type="number" min="0" className={inputClass} value={form.minStock} onChange={set('minStock')} />
          </Field>
          <Field label="Narxi (so'm)">
            <input type="number" min="0" className={inputClass} value={form.price} onChange={set('price')} />
          </Field>
        </div>
        <Field label="Yetkazib beruvchi">
          <input className={inputClass} value={form.supplier} onChange={set('supplier')} />
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
        className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-slate-200 bg-slate-50 transition hover:border-brand-300 hover:bg-brand-50"
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
        <p className="text-sm font-medium text-slate-600">Mahsulot rasmi</p>
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

function ImportModal({ open, onClose, onDone }) {
  const importProducts = useImportProducts()
  const [error, setError] = useState('')
  const [preview, setPreview] = useState([])
  const [fileName, setFileName] = useState('')

  useEffect(() => {
    if (!open) {
      setError('')
      setPreview([])
      setFileName('')
    }
  }, [open])

  const downloadTemplate = () => {
    exportRowsToExcel(
      [
        {
          Nomi: "A4 qog'oz (pachka)",
          Kategoriya: 'Kantselyariya',
          "O'lchov": 'pachka',
          'Shtrix-kod': '',
          Miqdor: 10,
          'Minimal zaxira': 5,
          Narxi: 38000,
          'Yetkazib beruvchi': 'OfisMarket MChJ',
        },
      ],
      'Mahsulotlar',
      'mahsulotlar-shablon.xlsx',
    )
  }

  const parseFile = async (file) => {
    setError('')
    setFileName(file.name)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf)
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
      const items = rows
        .map((r) => ({
          name: String(r.Nomi || r.name || '').trim(),
          category: String(r.Kategoriya || r.category || '').trim(),
          unit: String(r["O'lchov"] || r.unit || '').trim(),
          barcode: String(r['Shtrix-kod'] || r.barcode || '').trim(),
          quantity: r.Miqdor ?? r.quantity ?? 0,
          minStock: r['Minimal zaxira'] ?? r.minStock ?? 0,
          price: r.Narxi ?? r.price ?? 0,
          supplier: String(r['Yetkazib beruvchi'] || r.supplier || '').trim(),
        }))
        .filter((r) => r.name)
      if (!items.length) {
        setPreview([])
        setError("Faylda mahsulot qatorlari topilmadi. Shablondagi ustun nomlarini tekshiring.")
        return
      }
      setPreview(items)
    } catch {
      setPreview([])
      setError("Faylni o'qib bo'lmadi")
    }
  }

  const submit = async () => {
    setError('')
    try {
      const res = await importProducts.mutateAsync(preview)
      const skipped = res.errors?.length || 0
      const msg =
        skipped > 0
          ? `${res.created} ta mahsulot qo'shildi, ${skipped} ta qator o'tkazib yuborildi.`
          : `${res.created} ta mahsulot import qilindi.`
      onDone(msg)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Mahsulotlarni import qilish" wide>
      <div className="space-y-3.5">
        <p className="text-sm text-slate-600">
          Excel fayl yuklang. Kategoriya nomi tizimdagi nom bilan mos kelishi kerak. Bo'sh shtrix-kod avtomatik yoziladi.
        </p>
        <div className="flex flex-wrap gap-2">
          <SecondaryBtn type="button" onClick={downloadTemplate}>
            <Download size={15} /> Shablon yuklab olish
          </SecondaryBtn>
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200">
            <Upload size={15} /> Fayl tanlash
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && parseFile(e.target.files[0])}
            />
          </label>
        </div>
        {fileName && <p className="text-xs font-medium text-muted">{fileName}</p>}
        {preview.length > 0 && (
          <div className="max-h-48 overflow-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-400">
                  <th className="px-3 py-2">Nomi</th>
                  <th className="px-3 py-2">Kategoriya</th>
                  <th className="px-3 py-2">Miqdor</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 8).map((r, i) => (
                  <tr key={i} className="border-t border-slate-50">
                    <td className="px-3 py-2 font-medium">{r.name}</td>
                    <td className="px-3 py-2">{r.category || '—'}</td>
                    <td className="px-3 py-2">{r.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 8 && <p className="px-3 py-2 text-xs text-muted">va yana {preview.length - 8} ta qator</p>}
          </div>
        )}
        <ErrorNote>{error}</ErrorNote>
        <div className="flex gap-2">
          <SecondaryBtn type="button" onClick={onClose} className="flex-1">
            Bekor qilish
          </SecondaryBtn>
          <PrimaryBtn type="button" disabled={!preview.length || importProducts.isPending} className="flex-1" onClick={submit}>
            {importProducts.isPending ? 'Yuklanmoqda...' : `Import (${preview.length})`}
          </PrimaryBtn>
        </div>
      </div>
    </Modal>
  )
}

function emptyForm(product) {
  return {
    name: product?.name || '',
    categoryId: product?.categoryId || '',
    unit: product?.unit || '',
    barcode: product?.barcode || '',
    quantity: product?.quantity ?? 0,
    minStock: product?.minStock ?? 0,
    price: product?.price ?? 0,
    supplier: product?.supplier || '',
    photoUrl: product?.photoUrl || null,
  }
}
