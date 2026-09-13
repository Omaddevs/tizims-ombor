import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Database,
  Eye,
  FileBarChart2,
  Package,
  Pencil,
  SlidersHorizontal,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useDeleteTransaction, useEmployees, useProducts, useTransactions, useUpdateTransaction } from '../api/queries'
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
  Tabs,
  cn,
  inputClass,
} from '../components/ui'
import { Select } from '../components/Select'
import { CHIQUM_REASONS, formatDate, formatSum, reasonLabel } from '../lib/format'
import { exportRowsToExcel } from '../lib/excel'

const PAGE_SIZES = [
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
]

function lineSum(t) {
  return (Number(t.quantity) || 0) * (Number(t.product?.price) || 0)
}

function inMonth(iso, d) {
  const x = new Date(iso)
  return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth()
}

function formatDelta(curr, prev) {
  if (!curr && !prev) return ''
  if (!prev) return curr ? '+100%' : ''
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

function exportTransactions(rows) {
  exportRowsToExcel(
    rows.map((t) => ({
      Sana: formatDate(t.createdAt, true),
      Tur: t.type === 'in' ? 'Kirim' : 'Chiqim',
      Mahsulot: t.product?.name || '—',
      Miqdor: t.quantity,
      "O'lchov": t.product?.unit || '',
      Summasi: lineSum(t),
      Xodim: t.employee?.fullName || '—',
      Sabab: t.type === 'out' ? reasonLabel(t.reason) : '—',
      Bajardi: t.performedBy?.name || '—',
      Izoh: t.note || '—',
    })),
    'Jurnal',
    'kirim-chiqim-jurnali.xlsx',
  )
}

export default function Transactions() {
  const [params] = useSearchParams()
  const [type, setType] = useState(params.get('type') === 'out' || params.get('type') === 'in' ? params.get('type') : '')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [productId, setProductId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [reason, setReason] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selected, setSelected] = useState(() => new Set())
  const [viewRow, setViewRow] = useState(null)
  const [editRow, setEditRow] = useState(null)

  const { data: products } = useProducts()
  const { data: employees } = useEmployees()
  const { data: transactions, isLoading } = useTransactions({
    type: type || undefined,
    productId: productId || undefined,
    employeeId: employeeId || undefined,
    from: from ? `${from}T00:00:00` : undefined,
    to: to ? `${to}T23:59:59` : undefined,
  })
  const del = useDeleteTransaction()

  const list = transactions || []

  const counts = useMemo(
    () => ({
      all: list.length,
      in: list.filter((t) => t.type === 'in').length,
      out: list.filter((t) => t.type === 'out').length,
    }),
    [list],
  )

  const stats = useMemo(() => {
    const now = new Date()
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const inRows = list.filter((t) => t.type === 'in')
    const outRows = list.filter((t) => t.type === 'out')
    const totalIn = inRows.reduce((s, t) => s + lineSum(t), 0)
    const totalOut = outRows.reduce((s, t) => s + lineSum(t), 0)
    const thisIn = inRows.filter((t) => inMonth(t.createdAt, now)).reduce((s, t) => s + lineSum(t), 0)
    const lastIn = inRows.filter((t) => inMonth(t.createdAt, prev)).reduce((s, t) => s + lineSum(t), 0)
    const thisOut = outRows.filter((t) => inMonth(t.createdAt, now)).reduce((s, t) => s + lineSum(t), 0)
    const lastOut = outRows.filter((t) => inMonth(t.createdAt, prev)).reduce((s, t) => s + lineSum(t), 0)
    const balance = totalIn - totalOut
    const prevBalance = lastIn - lastOut
    const thisCount = list.filter((t) => inMonth(t.createdAt, now)).length
    return {
      totalIn,
      totalOut,
      balance,
      thisIn,
      thisOut,
      inDelta: formatDelta(thisIn, lastIn),
      outDelta: formatDelta(thisOut, lastOut),
      balanceDelta: formatDelta(balance, prevBalance),
      total: list.length,
      thisCount,
    }
  }, [list])

  const filtered = useMemo(() => list.filter((t) => !reason || t.reason === reason), [list, reason])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize) || 1)
  const safePage = Math.min(page, pages)
  const start = (safePage - 1) * pageSize
  const pageRows = filtered.slice(start, start + pageSize)
  const fromN = filtered.length ? start + 1 : 0
  const toN = Math.min(start + pageSize, filtered.length)

  useEffect(() => {
    setPage(1)
  }, [type, from, to, productId, employeeId, reason, pageSize])

  useEffect(() => {
    if (page > pages) setPage(pages)
  }, [page, pages])

  const filtersDirty = Boolean(from || to || productId || employeeId || reason)

  const resetFilters = () => {
    setFrom('')
    setTo('')
    setProductId('')
    setEmployeeId('')
    setReason('')
    setFiltersOpen(false)
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
    exportTransactions(rows)
  }

  const remove = async (row) => {
    if (row.type !== 'in') return
    const name = row.product?.name || 'harakat'
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

  const productOptions = [
    { value: '', label: 'Barcha mahsulotlar' },
    ...(products || []).map((p) => ({ value: p.id, label: p.name })),
  ]
  const employeeOptions = [
    { value: '', label: 'Barcha xodimlar' },
    ...(employees || []).map((e) => ({ value: e.id, label: e.fullName })),
  ]
  const reasonOptions = [{ value: '', label: 'Barcha sabablar' }, ...CHIQUM_REASONS.map((r) => ({ value: r.value, label: r.label }))]

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title="Kirim-chiqim jurnali"
        crumbs={['Asosiy', 'Jurnal']}
        subtitle="Barcha kirim va chiqim operatsiyalarining to'liq ro'yxati."
        action={
          <SecondaryBtn onClick={exportCurrent} disabled={!filtered.length}>
            <FileBarChart2 size={15} /> Excelga eksport
          </SecondaryBtn>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Jami kirim"
          value={formatSum(stats.totalIn)}
          delta={stats.inDelta}
          sub={`Bu oy: ${formatSum(stats.thisIn)}`}
          icon={TrendingUp}
          tone="green"
        />
        <KpiCard
          title="Jami chiqim"
          value={formatSum(stats.totalOut)}
          delta={stats.outDelta}
          sub={`Bu oy: ${formatSum(stats.thisOut)}`}
          icon={TrendingDown}
          tone="red"
        />
        <KpiCard
          title="Sof balans"
          value={formatSum(stats.balance)}
          delta={stats.balanceDelta}
          sub="Kirim - Chiqim"
          icon={Database}
          tone="brand"
        />
        <KpiCard
          title="Jami operatsiyalar"
          value={stats.total}
          sub={`Bu oy: ${stats.thisCount} ta`}
          icon={FileBarChart2}
          tone="violet"
        />
      </div>

      <div className="card flex flex-wrap items-center gap-3 px-3.5 py-3">
        <Tabs
          value={type}
          onChange={setType}
          items={[
            { id: '', label: `Barchasi (${counts.all})` },
            { id: 'in', label: `Kirim (${counts.in})` },
            { id: 'out', label: `Chiqim (${counts.out})` },
          ]}
        />
        <div className="flex min-w-[240px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          <CalendarDays size={16} className="shrink-0 text-slate-400" />
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[118px] bg-transparent text-sm outline-none" />
          <span className="text-slate-300">–</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[118px] bg-transparent text-sm outline-none" />
        </div>
        <Select value={productId} onChange={setProductId} options={productOptions} className="w-52" />
        <Select value={employeeId} onChange={setEmployeeId} options={employeeOptions} className="w-48" />
        <Select value={reason} onChange={setReason} options={reasonOptions} className="w-48" />
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
            <Field label="Sahifada nechta yozuv">
              <Select value={String(pageSize)} onChange={(v) => setPageSize(Number(v))} options={PAGE_SIZES} />
            </Field>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {isLoading && <p className="px-5 py-12 text-center text-sm text-muted">Yuklanmoqda...</p>}

        {!isLoading && !filtered.length && (
          <EmptyState title="Harakatlar topilmadi" hint="Filtrlarni o'zgartirib ko'ring." />
        )}

        {!isLoading && filtered.length > 0 && (
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
                  <th className="px-3 py-3.5">Tur</th>
                  <th className="px-3 py-3.5">Sana / vaqt</th>
                  <th className="px-3 py-3.5">Mahsulot</th>
                  <th className="px-3 py-3.5">Miqdor</th>
                  <th className="px-3 py-3.5">Summasi</th>
                  <th className="px-3 py-3.5">Xodim</th>
                  <th className="px-3 py-3.5">Sabab</th>
                  <th className="px-3 py-3.5 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pageRows.map((row, i) => (
                  <tr key={row.id} onClick={() => setViewRow(row)} className="cursor-pointer transition hover:bg-slate-50/80">
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
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 font-semibold',
                          row.type === 'in' ? 'text-emerald-600' : 'text-rose-600',
                        )}
                      >
                        {row.type === 'in' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {row.type === 'in' ? 'Kirim' : 'Chiqim'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-[13px] text-slate-600">{formatDate(row.createdAt, true)}</td>
                    <td className="px-3 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <ProductThumb url={row.product?.photoUrl} />
                        <div className="min-w-0">
                          <p className="max-w-[200px] truncate font-semibold text-ink">{row.product?.name || '—'}</p>
                          {row.product?.barcode && (
                            <p className="font-mono text-[11px] text-slate-400">{row.product.barcode}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {row.quantity} {row.product?.unit || ''}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-semibold text-ink">{formatSum(lineSum(row))}</td>
                    <td className="px-3 py-3">
                      {row.employee?.fullName ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-600">
                            {row.employee.fullName
                              .split(' ')
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((p) => p[0])
                              .join('')
                              .toUpperCase()}
                          </span>
                          <span className="max-w-[140px] truncate text-slate-600">{row.employee.fullName}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {row.type === 'out' ? (
                        <Badge tone={row.reason === 'internal' ? 'violet' : 'slate'}>{reasonLabel(row.reason)}</Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5">
                        <IconBtn label="Ko'rish" onClick={() => setViewRow(row)}>
                          <Eye size={15} />
                        </IconBtn>
                        <IconBtn
                          label={row.type === 'in' ? 'Tahrirlash' : "Faqat kirimni tahrirlash mumkin"}
                          disabled={row.type !== 'in'}
                          onClick={() => setEditRow(row)}
                        >
                          <Pencil size={15} />
                        </IconBtn>
                        <IconBtn
                          label={row.type === 'in' ? "O'chirish" : "Faqat kirimni o'chirish mumkin"}
                          tone="danger"
                          disabled={row.type !== 'in'}
                          onClick={() => remove(row)}
                        >
                          <Trash2 size={15} />
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
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

      <TransactionViewModal row={viewRow} onClose={() => setViewRow(null)} onEdit={() => { setEditRow(viewRow); setViewRow(null) }} />
      <TransactionEditModal key={editRow?.id || 'edit'} open={Boolean(editRow)} row={editRow} onClose={() => setEditRow(null)} />
    </div>
  )
}

function ProductThumb({ url }) {
  if (url) {
    return <img src={url} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-slate-100" />
  }
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-400">
      <Package size={16} />
    </span>
  )
}

function IconBtn({ children, onClick, label, tone, disabled }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'grid h-8 w-8 place-items-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent',
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

function Info({ label, value }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-ink">{value}</dd>
    </div>
  )
}

function TransactionViewModal({ row, onClose, onEdit }) {
  if (!row) return null
  return (
    <Modal open={Boolean(row)} onClose={onClose} title="Harakat ma'lumoti">
      <div className="flex items-start gap-3">
        <ProductThumb url={row.product?.photoUrl} />
        <div className="min-w-0">
          <p className="font-semibold text-ink">{row.product?.name || '—'}</p>
          <p className="mt-0.5 font-mono text-xs text-muted">{row.product?.barcode || '—'}</p>
          <div className="mt-2">
            <Badge tone={row.type === 'in' ? 'green' : 'red'}>{row.type === 'in' ? 'Kirim' : 'Chiqim'}</Badge>
          </div>
        </div>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <Info label="Sana" value={formatDate(row.createdAt, true)} />
        <Info label="Miqdor" value={`${row.quantity} ${row.product?.unit || ''}`} />
        <Info label="Narxi" value={formatSum(row.product?.price)} />
        <Info label="Jami summa" value={formatSum(lineSum(row))} />
        <Info label="Xodim" value={row.employee?.fullName || '—'} />
        <Info label="Sabab" value={row.type === 'out' ? reasonLabel(row.reason) : '—'} />
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
        {row.type === 'in' && (
          <PrimaryBtn className="flex-1" onClick={onEdit}>
            <Pencil size={15} /> Tahrirlash
          </PrimaryBtn>
        )}
      </div>
    </Modal>
  )
}

function TransactionEditModal({ open, row, onClose }) {
  const update = useUpdateTransaction()
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !row) return
    setQuantity(row.quantity)
    setNote(row.note || '')
    setError('')
  }, [open, row])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await update.mutateAsync({ id: row.id, quantity: Number(quantity), note })
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
          <Field label="Izoh">
            <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
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
