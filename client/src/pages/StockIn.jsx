import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Banknote,
  Boxes,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  Eye,
  LayoutGrid,
  LayoutList,
  Package,
  PackagePlus,
  Pencil,
  Plus,
  ScanLine,
  Search,
  SlidersHorizontal,
  Trash2,
  Truck,
} from 'lucide-react'
import {
  useCategories,
  useCreateTransaction,
  useDeleteTransaction,
  useProducts,
  useTransactions,
  useUpdateTransaction,
} from '../api/queries'
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
} from '../components/ui'
import { Select } from '../components/Select'
import { FileDrop } from '../components/FileDrop'
import { BarcodeScanner } from '../components/BarcodeScanner'
import { formatDate, formatSum } from '../lib/format'
import { exportRowsToExcel } from '../lib/excel'

const PAGE_SIZES = [
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
]

const COLUMNS = [
  { key: 'date', label: 'Sana' },
  { key: 'supplier', label: "Ta'minotchi" },
  { key: 'product', label: 'Mahsulot', locked: true },
  { key: 'barcode', label: 'Shtrix-kod' },
  { key: 'qty', label: 'Miqdor' },
  { key: 'price', label: 'Kirim narxi' },
  { key: 'sum', label: 'Jami summa' },
  { key: 'status', label: 'Holat' },
  { key: 'actions', label: 'Amallar' },
]

const STATUS_MAP = {
  completed: { id: 'completed', label: 'Kirim qilingan', tone: 'green' },
  pending: { id: 'pending', label: 'Tekshirilmoqda', tone: 'yellow' },
  partial: { id: 'partial', label: 'Qisman kirim', tone: 'orange' },
}

const STATUS_OPTIONS = [
  { value: '', label: 'Barcha holatlar' },
  { value: 'completed', label: 'Kirim qilingan' },
  { value: 'pending', label: 'Tekshirilmoqda' },
  { value: 'partial', label: 'Qisman kirim' },
]

function kirimSupplier(t) {
  if (t.supplier && t.supplier !== '—') return t.supplier
  const m = String(t.note || '').match(/Yetkazib beruvchi:\s*(.+)/i)
  if (m?.[1] && m[1].trim() !== '—') return m[1].trim()
  return t.product?.supplier || ''
}

function kirimStatus(t) {
  return STATUS_MAP[t.status] || STATUS_MAP.completed
}

function lineSum(t) {
  return (Number(t.quantity) || 0) * (Number(t.product?.price) || 0)
}

function inMonth(iso, d) {
  const x = new Date(iso)
  return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth()
}

function formatDelta(curr, prev) {
  if (!curr && !prev) return ''
  if (!prev) return '+100%'
  if (!curr) return ''
  const pct = Math.round(((curr - prev) / prev) * 100)
  if (!pct) return '0%'
  return `${pct > 0 ? '+' : ''}${pct}%`
}

function qtyClass(qty) {
  if (qty >= 10) return 'text-emerald-600'
  if (qty >= 5) return 'text-sky-600'
  if (qty <= 2) return 'text-orange-500'
  return 'text-slate-600'
}

function visiblePages(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  if (page <= 4) return [1, 2, 3, 4, 5, '…', pages]
  if (page >= pages - 3) return [1, '…', pages - 4, pages - 3, pages - 2, pages - 1, pages]
  return [1, '…', page - 1, page, page + 1, '…', pages]
}

function exportKirim(rows) {
  exportRowsToExcel(
    rows.map((t) => ({
      Sana: formatDate(t.createdAt, true),
      "Ta'minotchi": kirimSupplier(t) || '—',
      Mahsulot: t.product?.name || '—',
      'Shtrix-kod': t.product?.barcode || '',
      Miqdor: t.quantity,
      "O'lchov": t.product?.unit || '',
      'Kirim narxi': t.product?.price || 0,
      'Jami summa': lineSum(t),
      Holat: kirimStatus(t).label,
      Izoh: t.note || '—',
    })),
    'Kirimlar',
    'kirimlar.xlsx',
  )
}

export default function StockIn() {
  const [params, setParams] = useSearchParams()
  const presetProductId = params.get('productId')
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [supplier, setSupplier] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [view, setView] = useState('table')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [hiddenCols, setHiddenCols] = useState([])
  const [colsOpen, setColsOpen] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const [createOpen, setCreateOpen] = useState(false)
  const [viewRow, setViewRow] = useState(null)
  const [editRow, setEditRow] = useState(null)

  const { data: categories } = useCategories()
  const { data: products } = useProducts()
  const { data: transactions, isLoading } = useTransactions({ type: 'in' })
  const del = useDeleteTransaction()

  const colsRef = useRef(null)
  const list = transactions || []

  useEffect(() => {
    if (presetProductId) setCreateOpen(true)
  }, [presetProductId])

  const stats = useMemo(() => {
    const now = new Date()
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thisCount = list.filter((t) => inMonth(t.createdAt, now)).length
    const lastCount = list.filter((t) => inMonth(t.createdAt, prev)).length
    const thisSum = list.filter((t) => inMonth(t.createdAt, now)).reduce((s, t) => s + lineSum(t), 0)
    const lastSum = list.filter((t) => inMonth(t.createdAt, prev)).reduce((s, t) => s + lineSum(t), 0)
    const totalSum = list.reduce((s, t) => s + lineSum(t), 0)
    const suppliers = new Set(list.map(kirimSupplier).filter(Boolean))
    const productIds = new Set(list.map((t) => t.productId).filter(Boolean))
    return {
      total: list.length,
      totalSum,
      suppliers: suppliers.size,
      products: productIds.size,
      thisCount,
      thisSum,
      countDelta: formatDelta(thisCount, lastCount),
      sumDelta: formatDelta(thisSum, lastSum),
    }
  }, [list])

  const supplierOptions = useMemo(() => {
    const names = [...new Set(list.map(kirimSupplier).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'uz'))
    return [{ value: '', label: "Barcha ta'minotchilar" }, ...names.map((n) => ({ value: n, label: n }))]
  }, [list])

  const categoryOptions = [
    { value: '', label: 'Barcha kategoriyalar' },
    ...(categories || []).map((c) => ({ value: c.id, label: c.name })),
  ]

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const fromTs = from ? new Date(`${from}T00:00:00`).getTime() : null
    const toTs = to ? new Date(`${to}T23:59:59`).getTime() : null
    return list.filter((t) => {
      const ts = new Date(t.createdAt).getTime()
      if (fromTs != null && ts < fromTs) return false
      if (toTs != null && ts > toTs) return false
      if (supplier && kirimSupplier(t) !== supplier) return false
      if (categoryId && t.product?.categoryId !== categoryId) return false
      if (status && (t.status || 'completed') !== status) return false
      if (q) {
        const hay = `${t.product?.name || ''} ${t.product?.barcode || ''} ${kirimSupplier(t)}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [list, search, from, to, supplier, categoryId, status])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize) || 1)
  const safePage = Math.min(page, pages)
  const start = (safePage - 1) * pageSize
  const pageRows = filtered.slice(start, start + pageSize)
  const fromN = filtered.length ? start + 1 : 0
  const toN = Math.min(start + pageSize, filtered.length)

  useEffect(() => {
    setPage(1)
  }, [search, from, to, supplier, categoryId, status, pageSize])

  useEffect(() => {
    if (page > pages) setPage(pages)
  }, [page, pages])

  useEffect(() => {
    const onDoc = (e) => {
      if (colsRef.current && !colsRef.current.contains(e.target)) setColsOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const filtersDirty = Boolean(search || from || to || supplier || categoryId || status)

  const resetFilters = () => {
    setSearch('')
    setFrom('')
    setTo('')
    setSupplier('')
    setCategoryId('')
    setStatus('')
    setFiltersOpen(false)
  }

  const colOn = (key) => !hiddenCols.includes(key)
  const toggleCol = (key) => {
    setHiddenCols((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))
  const toggleAllPage = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allPageSelected) pageRows.forEach((r) => next.delete(r.id))
      else pageRows.forEach((r) => next.add(r.id))
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
    const rows = selected.size ? filtered.filter((t) => selected.has(t.id)) : filtered
    exportKirim(rows)
  }

  const remove = async (row) => {
    const name = row.product?.name || 'kirim'
    if (!confirm(`"${name}" kirimini o'chirmoqchimisiz? Ombordagi qoldiq ham kamayadi.`)) return
    try {
      await del.mutateAsync(row.id)
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(row.id)
        return next
      })
    } catch (e) {
      alert(e.message)
    }
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title="Kirim"
        crumbs={['Asosiy', 'Kirim']}
        subtitle="Omborga kelib tushgan mahsulotlar va ta'minotchilar hisobini yuriting."
        action={
          <>
            <SecondaryBtn onClick={exportCurrent} disabled={!filtered.length}>
              <Download size={15} /> Excelga eksport
            </SecondaryBtn>
            <PrimaryBtn onClick={() => setCreateOpen(true)}>
              <Plus size={16} /> Yangi kirim
            </PrimaryBtn>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Jami kirimlar"
          value={stats.total}
          delta={stats.countDelta}
          sub={`Bu oyda ${stats.thisCount} ta`}
          icon={PackagePlus}
          tone="green"
        />
        <KpiCard
          title="Jami kirim summasi"
          value={formatSum(stats.totalSum)}
          delta={stats.sumDelta}
          sub={`Bu oyda ${formatSum(stats.thisSum)}`}
          icon={Banknote}
          tone="brand"
        />
        <KpiCard
          title="Ta'minotchilar"
          value={stats.suppliers}
          sub="Faol ta'minotchilar"
          icon={Truck}
          tone="violet"
        />
        <KpiCard
          title="Turdagi mahsulot"
          value={stats.products}
          sub="Kirim qilingan"
          icon={Boxes}
          tone="orange"
        />
      </div>

      <div className="card flex flex-wrap items-center gap-3 px-3.5 py-3">
        <div className="flex min-w-[240px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          <CalendarDays size={16} className="shrink-0 text-slate-400" />
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[118px] bg-transparent text-sm outline-none" />
          <span className="text-slate-300">–</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[118px] bg-transparent text-sm outline-none" />
        </div>
        <Select value={supplier} onChange={setSupplier} options={supplierOptions} className="w-52" />
        <Select value={categoryId} onChange={setCategoryId} options={categoryOptions} className="w-52" />
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
          <Search size={16} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Mahsulot nomi yoki shtrix-kod..."
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
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
          <div className="w-56">
            <Field label="Holat">
              <Select value={status} onChange={setStatus} options={STATUS_OPTIONS} />
            </Field>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
          <p className="text-[15px] font-semibold text-ink">
            Kirimlar ro'yxati <span className="font-medium text-muted">({filtered.length} ta)</span>
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
          <EmptyState title="Kirim topilmadi" hint="Yangi kirim qo'shing yoki filtrlarni o'zgartiring." />
        )}

        {!isLoading && filtered.length > 0 && view === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1020px] text-left text-sm">
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
                  {colOn('date') && <th className="px-3 py-3.5">Sana</th>}
                  {colOn('supplier') && <th className="px-3 py-3.5">Ta'minotchi</th>}
                  {colOn('product') && <th className="px-3 py-3.5">Mahsulot</th>}
                  {colOn('barcode') && <th className="px-3 py-3.5">Shtrix-kod</th>}
                  {colOn('qty') && <th className="px-3 py-3.5">Miqdor</th>}
                  {colOn('price') && <th className="px-3 py-3.5">Kirim narxi</th>}
                  {colOn('sum') && <th className="px-3 py-3.5">Jami summa</th>}
                  {colOn('status') && <th className="px-3 py-3.5">Holat</th>}
                  {colOn('actions') && <th className="px-3 py-3.5 text-right">Amallar</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pageRows.map((row, i) => {
                  const st = kirimStatus(row)
                  const sup = kirimSupplier(row)
                  return (
                    <tr
                      key={row.id}
                      onClick={() => setViewRow(row)}
                      className="cursor-pointer transition hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-3 sm:px-5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(row.id)}
                          onChange={() => toggleOne(row.id)}
                          className="h-4 w-4 accent-brand-600"
                          aria-label="Qatorni tanlash"
                        />
                      </td>
                      <td className="px-2 py-3 text-slate-400">{start + i + 1}</td>
                      {colOn('date') && (
                        <td className="whitespace-nowrap px-3 py-3 text-[13px] text-slate-600">{formatDate(row.createdAt, true)}</td>
                      )}
                      {colOn('supplier') && (
                        <td className="max-w-[180px] truncate px-3 py-3 text-slate-600">{sup || '—'}</td>
                      )}
                      {colOn('product') && (
                        <td className="px-3 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <ProductThumb url={row.product?.photoUrl} />
                            <p className="max-w-[220px] truncate font-semibold text-ink">{row.product?.name || '—'}</p>
                          </div>
                        </td>
                      )}
                      {colOn('barcode') && (
                        <td className="px-3 py-3">
                          <span className="rounded-lg bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-500">
                            {row.product?.barcode || '—'}
                          </span>
                        </td>
                      )}
                      {colOn('qty') && (
                        <td className="whitespace-nowrap px-3 py-3">
                          <span className={cn('text-[13px] font-semibold', qtyClass(row.quantity))}>
                            {row.quantity} {row.product?.unit || ''}
                          </span>
                        </td>
                      )}
                      {colOn('price') && (
                        <td className="whitespace-nowrap px-3 py-3 font-medium">{formatSum(row.product?.price)}</td>
                      )}
                      {colOn('sum') && (
                        <td className="whitespace-nowrap px-3 py-3 font-semibold text-ink">{formatSum(lineSum(row))}</td>
                      )}
                      {colOn('status') && (
                        <td className="px-3 py-3">
                          <Badge tone={st.tone}>{st.label}</Badge>
                        </td>
                      )}
                      {colOn('actions') && (
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-0.5">
                            <IconBtn label="Ko'rish" onClick={() => setViewRow(row)}>
                              <Eye size={15} />
                            </IconBtn>
                            <IconBtn label="Tahrirlash" onClick={() => setEditRow(row)}>
                              <Pencil size={15} />
                            </IconBtn>
                            <IconBtn label="O'chirish" tone="danger" onClick={() => remove(row)}>
                              <Trash2 size={15} />
                            </IconBtn>
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
              const st = kirimStatus(row)
              return (
                <article
                  key={row.id}
                  className="flex cursor-pointer flex-col rounded-2xl border border-slate-100 p-4 transition hover:bg-slate-50/80"
                  onClick={() => setViewRow(row)}
                >
                  <div className="flex items-start gap-3">
                    <span onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleOne(row.id)}
                        className="mt-1 h-4 w-4 accent-brand-600"
                        aria-label="Kartani tanlash"
                      />
                    </span>
                    <ProductThumb url={row.product?.photoUrl} large />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{row.product?.name || '—'}</p>
                      <p className="mt-0.5 truncate text-[13px] text-muted">{kirimSupplier(row) || 'Ta\'minotchi yo\'q'}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{formatDate(row.createdAt, true)}</p>
                    </div>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className={cn('text-sm font-semibold', qtyClass(row.quantity))}>
                        {row.quantity} {row.product?.unit || ''}
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-ink">{formatSum(lineSum(row))}</p>
                    </div>
                    <div className="flex" onClick={(e) => e.stopPropagation()}>
                      <IconBtn label="Ko'rish" onClick={() => setViewRow(row)}>
                        <Eye size={15} />
                      </IconBtn>
                      <IconBtn label="Tahrirlash" onClick={() => setEditRow(row)}>
                        <Pencil size={15} />
                      </IconBtn>
                      <IconBtn label="O'chirish" tone="danger" onClick={() => remove(row)}>
                        <Trash2 size={15} />
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

      <NewKirimModal
        open={createOpen}
        products={products}
        presetProductId={presetProductId}
        onClose={() => {
          setCreateOpen(false)
          if (presetProductId) {
            const next = new URLSearchParams(params)
            next.delete('productId')
            setParams(next, { replace: true })
          }
        }}
      />
      <KirimViewModal
        row={viewRow}
        onClose={() => setViewRow(null)}
        onEdit={() => {
          setEditRow(viewRow)
          setViewRow(null)
        }}
      />
      <KirimEditModal key={editRow?.id || 'edit'} open={Boolean(editRow)} row={editRow} onClose={() => setEditRow(null)} />
    </div>
  )
}

function NewKirimModal({ open, onClose, products, presetProductId }) {
  const create = useCreateTransaction()
  const [search, setSearch] = useState('')
  const [scanning, setScanning] = useState(false)
  const [product, setProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [supplier, setSupplier] = useState('')
  const [documentUrl, setDocumentUrl] = useState(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const { data: results, isFetching } = useProducts({ search })

  useEffect(() => {
    if (!open) return
    setSearch('')
    setScanning(false)
    setProduct(null)
    setQuantity(1)
    setSupplier('')
    setDocumentUrl(null)
    setNote('')
    setError('')
    setSuccess(false)
  }, [open])

  useEffect(() => {
    if (!open || !presetProductId) return
    const preset = (products || []).find((p) => p.id === presetProductId)
    if (!preset) return
    setProduct((current) => (current && current.id !== presetProductId ? current : preset))
    setSupplier((value) => value || preset.supplier || '')
  }, [open, presetProductId, products])

  const onDetected = (code) => {
    setScanning(false)
    const found = (results || products || []).find((p) => p.barcode === code)
    if (found) setProduct(found)
    else setSearch(code)
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!product) return setError('Mahsulotni tanlang')
    try {
      await create.mutateAsync({
        productId: product.id,
        type: 'in',
        quantity: Number(quantity),
        documentUrl,
        note,
        supplier: supplier || product.supplier || '',
        status: 'completed',
      })
      setSuccess(true)
    } catch (e2) {
      setError(e2.message)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Yangi kirim" wide>
      {success ? (
        <div className="py-4 text-center">
          <CheckCircle2 size={40} className="mx-auto text-emerald-600" />
          <h2 className="mt-3 text-lg font-bold">Kirim muvaffaqiyatli qayd etildi</h2>
          <p className="mt-1 text-sm text-muted">
            {product?.name}: +{quantity} {product?.unit}
          </p>
          <div className="mt-5 flex gap-2">
            <SecondaryBtn className="flex-1" onClick={onClose}>
              Ro'yxatga qaytish
            </SecondaryBtn>
            <PrimaryBtn
              className="flex-1"
              onClick={() => {
                setSuccess(false)
                setProduct(null)
                setQuantity(1)
                setSupplier('')
                setDocumentUrl(null)
                setNote('')
                setSearch('')
              }}
            >
              Yana kirim qilish
            </PrimaryBtn>
          </div>
        </div>
      ) : (
        <div>
          <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-600">
            <PackagePlus size={16} /> Omborga yangi tovar qabul qilish
          </p>
          {!product ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
                  <Search size={16} className="text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Mahsulot nomi yoki shtrix-kod"
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
                <SecondaryBtn type="button" onClick={() => setScanning((v) => !v)} className="!px-3.5">
                  <ScanLine size={18} />
                </SecondaryBtn>
              </div>
              {scanning && (
                <div className="max-w-xs">
                  <BarcodeScanner active={scanning} onDetected={onDetected} />
                </div>
              )}
              {search && (
                <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-2xl border border-slate-100">
                  {(results || []).map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setProduct(p)
                          setSupplier(p.supplier || '')
                        }}
                        className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm hover:bg-slate-50"
                      >
                        <span className="min-w-0 truncate">{p.name}</span>
                        <Badge tone="slate">
                          {p.quantity} {p.unit}
                        </Badge>
                      </button>
                    </li>
                  ))}
                  {isFetching && <li className="px-3.5 py-4 text-center text-sm text-muted">Qidirilmoqda...</li>}
                  {!isFetching && !results?.length && <li className="px-3.5 py-4 text-center text-sm text-muted">Topilmadi</li>}
                </ul>
              )}
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3.5">
              <div className="flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3">
                <div>
                  <p className="font-semibold">{product.name}</p>
                  <p className="text-xs text-muted">
                    Joriy qoldiq: {product.quantity} {product.unit}
                  </p>
                </div>
                <button type="button" onClick={() => setProduct(null)} className="text-xs font-semibold text-brand-700">
                  O'zgartirish
                </button>
              </div>
              <Field label={`Miqdor (${product.unit})`}>
                <input
                  type="number"
                  min="1"
                  className={inputClass}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </Field>
              <Field label="Yetkazib beruvchi">
                <input
                  className={inputClass}
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder={product.supplier || 'Kompaniya nomi'}
                />
              </Field>
              <Field label="Izoh (ixtiyoriy)">
                <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
              <Field label="Chek yoki hujjat">
                <FileDrop value={documentUrl} onChange={setDocumentUrl} />
              </Field>
              <ErrorNote>{error}</ErrorNote>
              <PrimaryBtn type="submit" disabled={create.isPending} className="w-full">
                {create.isPending
                  ? 'Saqlanmoqda...'
                  : `Kirimni tasdiqlash (${formatSum(product.price * Number(quantity || 0))})`}
              </PrimaryBtn>
            </form>
          )}
        </div>
      )}
    </Modal>
  )
}

function KirimViewModal({ row, onClose, onEdit }) {
  if (!row) return null
  const st = kirimStatus(row)
  return (
    <Modal open={Boolean(row)} onClose={onClose} title="Kirim ma'lumoti">
      <div className="flex items-start gap-3">
        <ProductThumb url={row.product?.photoUrl} large />
        <div className="min-w-0">
          <p className="font-semibold text-ink">{row.product?.name || '—'}</p>
          <p className="mt-0.5 font-mono text-xs text-muted">{row.product?.barcode || '—'}</p>
          <div className="mt-2">
            <Badge tone={st.tone}>{st.label}</Badge>
          </div>
        </div>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <Info label="Sana" value={formatDate(row.createdAt, true)} />
        <Info label="Ta'minotchi" value={kirimSupplier(row) || '—'} />
        <Info label="Miqdor" value={`${row.quantity} ${row.product?.unit || ''}`} />
        <Info label="Kirim narxi" value={formatSum(row.product?.price)} />
        <Info label="Jami summa" value={formatSum(lineSum(row))} />
        <Info label="Bajardi" value={row.performedBy?.name || '—'} />
      </dl>
      {row.note ? <p className="mt-3 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">{row.note}</p> : null}
      {row.documentUrl ? (
        <a href={row.documentUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-brand-600">
          Hujjatni ochish
        </a>
      ) : null}
      <div className="mt-5 flex gap-2">
        <SecondaryBtn className="flex-1" onClick={onClose}>
          Yopish
        </SecondaryBtn>
        <PrimaryBtn className="flex-1" onClick={onEdit}>
          <Pencil size={15} /> Tahrirlash
        </PrimaryBtn>
      </div>
    </Modal>
  )
}

function KirimEditModal({ open, row, onClose }) {
  const update = useUpdateTransaction()
  const [quantity, setQuantity] = useState(1)
  const [supplier, setSupplier] = useState('')
  const [note, setNote] = useState('')
  const [status, setStatus] = useState('completed')
  const [documentUrl, setDocumentUrl] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !row) return
    setQuantity(row.quantity)
    setSupplier(kirimSupplier(row))
    setNote(row.note || '')
    setStatus(row.status || 'completed')
    setDocumentUrl(row.documentUrl || null)
    setError('')
  }, [open, row])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await update.mutateAsync({
        id: row.id,
        quantity: Number(quantity),
        supplier,
        note,
        status,
        documentUrl,
      })
      onClose()
    } catch (e2) {
      setError(e2.message)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Kirimni tahrirlash">
      {row && (
        <form onSubmit={submit} className="space-y-3.5">
          <p className="rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm font-semibold">{row.product?.name}</p>
          <Field label={`Miqdor (${row.product?.unit || ''})`}>
            <input
              type="number"
              min="1"
              className={inputClass}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </Field>
          <Field label="Yetkazib beruvchi">
            <input className={inputClass} value={supplier} onChange={(e) => setSupplier(e.target.value)} />
          </Field>
          <Field label="Holat">
            <Select value={status} onChange={setStatus} options={STATUS_OPTIONS.filter((o) => o.value)} />
          </Field>
          <Field label="Izoh">
            <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Field label="Chek yoki hujjat">
            <FileDrop value={documentUrl} onChange={setDocumentUrl} />
          </Field>
          <ErrorNote>{error}</ErrorNote>
          <PrimaryBtn type="submit" disabled={update.isPending} className="w-full">
            {update.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
          </PrimaryBtn>
        </form>
      )}
    </Modal>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-ink">{value}</dd>
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

function IconBtn({ children, onClick, label, tone }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'grid h-8 w-8 place-items-center rounded-lg transition',
        tone === 'danger' ? 'text-rose-400 hover:bg-rose-50 hover:text-rose-600' : 'text-slate-400 hover:bg-slate-50 hover:text-brand-600',
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
