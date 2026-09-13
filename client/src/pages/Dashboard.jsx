import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  ArrowDown,
  ArrowUp,
  Boxes,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  PackageMinus,
  PackagePlus,
  QrCode,
  ScanLine,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useAuthStore, useCurrentUser } from '../store/useAuthStore'
import {
  useAssignments,
  useCategories,
  useConfirmAssignment,
  useEmployees,
  useProducts,
  useReportSummary,
  useTransactions,
} from '../api/queries'
import { Badge, CardHead, PageHeader, Pill, PrimaryBtn, ProgressBar, RadialProgress, cn } from '../components/ui'
import { IlluWelcome } from '../components/illustrations'
import { formatDate, formatSum } from '../lib/format'

const WEEKDAY_FULL = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba']
const CATEGORY_COLORS = ['#f43f5e', '#10b981', '#f59e0b', '#3b6cf5', '#94a3b8', '#8b5cf6']

export default function Dashboard() {
  const me = useCurrentUser()
  if (me?.role === 'employee') return <EmployeeDashboard />
  return <StaffDashboard />
}

function toInputDate(d) {
  const dt = new Date(d)
  const pad = (n) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}

function deltaPct(curr, prev) {
  if (!prev) return curr > 0 ? 100 : curr < 0 ? -100 : null
  return Math.round(((curr - prev) / prev) * 100)
}

function DeltaTag({ value }) {
  if (value === null || value === undefined) return null
  const positive = value >= 0
  const Icon = positive ? ArrowUp : ArrowDown
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold',
        positive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500',
      )}
    >
      <Icon size={11} strokeWidth={2.5} /> {positive ? '+' : ''}
      {value}%
    </span>
  )
}

function useDateRange() {
  return useState(() => {
    const to = new Date()
    to.setHours(23, 59, 59, 999)
    const from = new Date()
    from.setDate(from.getDate() - 29)
    from.setHours(0, 0, 0, 0)
    return { from, to }
  })
}

function DateRangePicker({ range, onChange }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({ from: toInputDate(range.from), to: toInputDate(range.to) })
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
    setDraft({ from: toInputDate(range.from), to: toInputDate(range.to) })
  }, [range])

  const applyPreset = (days) => {
    const to = new Date()
    to.setHours(23, 59, 59, 999)
    const from = new Date()
    from.setDate(from.getDate() - (days - 1))
    from.setHours(0, 0, 0, 0)
    onChange({ from, to })
    setOpen(false)
  }

  const applyCustom = () => {
    if (!draft.from || !draft.to) return
    const from = new Date(`${draft.from}T00:00:00`)
    const to = new Date(`${draft.to}T23:59:59`)
    if (from > to) return
    onChange({ from, to })
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
      >
        <CalendarDays size={15} className="text-slate-400" />
        {formatDate(range.from)} – {formatDate(range.to)}
        <ChevronDown size={14} className={cn('text-slate-400 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-72 rounded-2xl bg-white p-3.5 shadow-xl ring-1 ring-slate-100">
          <div className="flex gap-1.5">
            {[
              { label: '7 kun', days: 7 },
              { label: '30 kun', days: 30 },
              { label: '90 kun', days: 90 },
            ].map((p) => (
              <button
                key={p.days}
                type="button"
                onClick={() => applyPreset(p.days)}
                className="flex-1 rounded-lg bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-brand-50 hover:text-brand-700"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-2.5">
            <label className="block text-xs font-medium text-slate-500">
              Boshlanish sanasi
              <input
                type="date"
                value={draft.from}
                onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
                className="date-input mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500"
              />
            </label>
            <label className="block text-xs font-medium text-slate-500">
              Tugash sanasi
              <input
                type="date"
                value={draft.to}
                onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
                className="date-input mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={applyCustom}
            className="mt-3 w-full rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700"
          >
            Qo'llash
          </button>
        </div>
      )}
    </div>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const inRow = payload.find((p) => p.dataKey === 'inSum')
  const outRow = payload.find((p) => p.dataKey === 'outSum')
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-2.5 text-xs shadow-xl">
      <p className="mb-1.5 font-semibold text-ink">{formatDate(label)}</p>
      <p className="flex items-center gap-1.5 font-medium text-emerald-600">
        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Kirim: {formatSum(inRow?.value)}
      </p>
      <p className="mt-1 flex items-center gap-1.5 font-medium text-rose-500">
        <span className="h-2 w-2 rounded-full bg-rose-500" /> Chiqim: {formatSum(outRow?.value)}
      </p>
    </div>
  )
}

function StaffDashboard() {
  const navigate = useNavigate()
  const org = useAuthStore((s) => s.org)
  const { data: products } = useProducts()
  const { data: categories } = useCategories()
  const { data: employees } = useEmployees()
  const { data: recentTxns } = useTransactions({})
  const [range, setRange] = useDateRange()

  const { fromISO, toISO, prevFromISO, prevToISO, prevToDate } = useMemo(() => {
    const days = Math.max(1, Math.round((range.to - range.from) / 86400000) + 1)
    const prevTo = new Date(range.from.getTime() - 1000)
    const prevFrom = new Date(prevTo.getTime() - (days - 1) * 86400000)
    prevFrom.setHours(0, 0, 0, 0)
    return {
      fromISO: range.from.toISOString(),
      toISO: range.to.toISOString(),
      prevFromISO: prevFrom.toISOString(),
      prevToISO: prevTo.toISOString(),
      prevToDate: prevTo,
    }
  }, [range])

  const { data: summary } = useReportSummary({ from: fromISO, to: toISO })
  const { data: prevSummary } = useReportSummary({ from: prevFromISO, to: prevToISO })

  const totalValue = (products || []).reduce((s, p) => s + p.quantity * p.price, 0)
  const health = products?.length
    ? Math.round(((products.filter((p) => p.quantity > p.minStock).length || 0) / products.length) * 100)
    : 0

  const productsDelta = useMemo(() => {
    if (!products?.length) return null
    const asOfPrev = products.filter((p) => new Date(p.createdAt) <= prevToDate).length
    return deltaPct(products.length, asOfPrev)
  }, [products, prevToDate])

  const inDelta = deltaPct(summary?.totals?.inSum, prevSummary?.totals?.inSum)
  const outDelta = deltaPct(summary?.totals?.outSum, prevSummary?.totals?.outSum)

  const activeEmployees = (employees || []).filter((e) => (e.status || 'active') === 'active').length
  const employeeHealth = employees?.length ? Math.round((activeEmployees / employees.length) * 100) : 0

  const categoryHealth = useMemo(() => {
    return (categories || [])
      .map((c) => {
        const items = (products || []).filter((p) => p.categoryId === c.id)
        const total = items.length
        const ok = items.filter((p) => p.quantity > p.minStock).length
        const pct = total ? Math.round((ok / total) * 100) : 0
        return { id: c.id, name: c.name, pct, total, ok }
      })
      .filter((c) => c.total > 0)
  }, [categories, products])

  const pieData = categoryHealth.map((c, i) => ({ ...c, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))

  const recentIn = (recentTxns || []).filter((t) => t.type === 'in').slice(0, 5)
  const recentOut = (recentTxns || []).filter((t) => t.type === 'out').slice(0, 5)
  const topProducts = (summary?.byProduct || [])
    .filter((p) => p.outQty > 0)
    .sort((a, b) => b.outQty - a.outQty)
    .slice(0, 5)
  const maxOutQty = Math.max(1, ...topProducts.map((p) => p.outQty))
  const topEmployees = (summary?.byEmployee || []).slice(0, 5)
  const maxOutSum = Math.max(1, ...topEmployees.map((e) => e.outSum))

  const rangeDays = Math.max(1, Math.round((range.to - range.from) / 86400000) + 1)

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title="Dashboard"
        crumbs={['Asosiy', 'Dashboard']}
        subtitle="Ombor harakatlari bo'yicha umumiy ko'rsatkichlar va tahlillar."
        action={
          <>
            <DateRangePicker range={range} onChange={setRange} />
            <PrimaryBtn onClick={() => navigate('/stock-in')}>
              <Boxes size={16} /> Boshqaruv paneli
            </PrimaryBtn>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card flex items-start justify-between gap-3 p-5">
          <div className="min-w-0">
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <Boxes size={20} />
            </div>
            <p className="text-[13px] text-muted">Jami mahsulotlar</p>
            <p className="mt-1 truncate text-2xl font-bold leading-tight text-ink">{products?.length ?? 0}</p>
            <p className="mt-1 text-xs font-medium text-muted">o'tgan davrga nisbatan</p>
          </div>
          <DeltaTag value={productsDelta} />
        </div>

        <div className="card flex items-start justify-between gap-3 p-5">
          <div className="min-w-0">
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <PackagePlus size={20} />
            </div>
            <p className="text-[13px] text-muted">Jami kirim</p>
            <p className="mt-1 text-xl font-bold leading-tight text-ink">{formatSum(summary?.totals?.inSum)}</p>
            <p className="mt-1 text-xs font-medium text-muted">{summary?.totals?.inCount ?? 0} ta operatsiya</p>
          </div>
          <DeltaTag value={inDelta} />
        </div>

        <div className="card flex items-start justify-between gap-3 p-5">
          <div className="min-w-0">
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-rose-50 text-rose-500">
              <PackageMinus size={20} />
            </div>
            <p className="text-[13px] text-muted">Jami chiqim</p>
            <p className="mt-1 text-xl font-bold leading-tight text-ink">{formatSum(summary?.totals?.outSum)}</p>
            <p className="mt-1 text-xs font-medium text-muted">{summary?.totals?.outCount ?? 0} ta operatsiya</p>
          </div>
          <DeltaTag value={outDelta} />
        </div>

        <div className="card flex items-center justify-between gap-3 p-5">
          <div className="min-w-0">
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-violet-50 text-violet-600">
              <Users size={20} />
            </div>
            <p className="text-[13px] text-muted">Faol xodimlar</p>
            <p className="mt-1 truncate text-2xl font-bold leading-tight text-ink">{activeEmployees}</p>
            <p className="mt-1 text-xs font-medium text-muted">Jami {employees?.length ?? 0} ta xodim</p>
          </div>
          <RadialProgress value={employeeHealth} size={62} stroke={6} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="card p-5 xl:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-[15px] font-semibold text-ink">Kirim-chiqim dinamikasi</h3>
              <p className="text-[13px] text-muted">So'nggi {rangeDays} kun</p>
            </div>
            <div className="flex items-center gap-3 text-[12px] font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Kirim
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Chiqim
              </span>
            </div>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary?.byDay || []}>
                <defs>
                  <linearGradient id="inGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="outGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={(d) => d.slice(5)}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
                  width={40}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="inSum" name="Kirim" stroke="#10b981" strokeWidth={2.5} fill="url(#inGrad)" dot={false} />
                <Area type="monotone" dataKey="outSum" name="Chiqim" stroke="#f43f5e" strokeWidth={2.5} fill="url(#outGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-ink">Ombor holati</h3>
            <button onClick={() => navigate('/products')} className="text-xs font-semibold text-brand-600">
              Barchasi →
            </button>
          </div>
          {pieData.length ? (
            <div className="mt-2 flex items-center gap-4">
              <div className="relative h-40 w-40 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="total" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2} stroke="none">
                      {pieData.map((entry) => (
                        <Cell key={entry.id} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-2xl font-bold leading-tight text-ink">{health}%</p>
                  <p className="text-[11px] text-muted">Yetarli</p>
                </div>
              </div>
              <ul className="min-w-0 flex-1 space-y-2">
                {pieData.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                      <span className="truncate text-slate-600">{c.name}</span>
                    </span>
                    <span
                      className={cn(
                        'shrink-0 font-semibold',
                        c.pct >= 80 ? 'text-emerald-500' : c.pct >= 40 ? 'text-amber-500' : 'text-rose-500',
                      )}
                    >
                      {c.pct}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="py-16 text-center text-[13px] text-muted">Kategoriya ma'lumoti yo'q</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TxnTable title="So'nggi kirimlar" rows={recentIn} tone="green" onSeeAll={() => navigate('/transactions?type=in')} />
        <TxnTable title="So'nggi chiqimlar" rows={recentOut} tone="rose" onSeeAll={() => navigate('/transactions?type=out')} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-ink">Top mahsulotlar (chiqim)</h3>
            <button onClick={() => navigate('/reports')} className="text-xs font-semibold text-brand-600">
              Barchasi →
            </button>
          </div>
          <ul className="mt-3 space-y-3">
            {topProducts.map((p, i) => (
              <li key={p.productId} className="flex items-center gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-slate-100 text-[11px] font-bold text-slate-500">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13.5px] font-medium text-ink">{p.name}</p>
                    <span className="shrink-0 text-xs font-semibold text-muted">{p.outQty} ta</span>
                  </div>
                  <ProgressBar value={(p.outQty / maxOutQty) * 100} tone="bg-brand-600" />
                </div>
              </li>
            ))}
            {!topProducts.length && <p className="py-8 text-center text-sm text-muted">Ushbu davrda chiqim bo'lmagan</p>}
          </ul>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-ink">Faol xodimlar (chiqim bo'yicha)</h3>
            <button onClick={() => navigate('/employees')} className="text-xs font-semibold text-brand-600">
              Barchasi →
            </button>
          </div>
          <ul className="mt-3 space-y-1">
            {topEmployees.map((e, i) => (
              <li key={e.employeeId} className="flex items-center gap-3 rounded-xl px-1 py-1.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-[11px] font-bold text-slate-500">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-ink">{e.fullName}</p>
                  <ProgressBar value={(e.outSum / maxOutSum) * 100} tone="bg-violet-500" />
                </div>
                <span className="shrink-0 text-xs font-semibold text-muted">{formatSum(e.outSum)}</span>
              </li>
            ))}
            {!topEmployees.length && <p className="py-8 text-center text-sm text-muted">Ushbu davrda harakat yo'q</p>}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card flex flex-col justify-between gap-4 bg-brand-50/60 p-5 lg:col-span-2">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm">
              <QrCode size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-ink">Tezkor skanerlash</p>
              <p className="mt-0.5 text-[12.5px] text-slate-500">QR kod orqali mahsulotni kiritish yoki biriktiring.</p>
            </div>
          </div>
          <PrimaryBtn onClick={() => navigate('/scan')} className="w-full sm:w-auto">
            <ScanLine size={16} /> Skanerlashni boshlash
          </PrimaryBtn>
        </div>

        <div className="flex flex-col gap-4">
          <div className="card flex items-center gap-3 p-5">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500">
              <Building2 size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] text-muted">Tashkilot</p>
              <p className="truncate text-[14px] font-semibold text-ink">{org?.name || '—'}</p>
            </div>
          </div>
          <div className="card flex items-center gap-3 p-5">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500">
              <CalendarDays size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] text-muted">Joriy sana</p>
              <p className="truncate text-[14px] font-semibold text-ink">{formatDate(new Date())}</p>
              <p className="text-[11px] text-muted">{WEEKDAY_FULL[new Date().getDay()]}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TxnTable({ title, rows, tone, onSeeAll }) {
  const toneClass = tone === 'green' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
  const Icon = tone === 'green' ? TrendingUp : TrendingDown
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4">
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        <button onClick={onSeeAll} className="text-xs font-semibold text-brand-600">
          Barchasini ko'rish →
        </button>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-[13px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-slate-400">
              <th className="px-5 pb-2 font-semibold">Mahsulot</th>
              <th className="px-2 pb-2 font-semibold">Miqdor</th>
              <th className="px-2 pb-2 font-semibold">Summasi</th>
              <th className="px-5 pb-2 text-right font-semibold">Sana</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50/70">
                <td className="px-5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-lg', toneClass)}>
                      <Icon size={13} />
                    </span>
                    <span className="truncate font-medium text-ink">{t.product?.name}</span>
                  </div>
                </td>
                <td className="px-2 py-2.5 text-slate-600">
                  {t.quantity} {t.product?.unit}
                </td>
                <td className="px-2 py-2.5 font-medium text-ink">{formatSum(t.quantity * (t.product?.price || 0))}</td>
                <td className="px-5 py-2.5 text-right text-slate-500">{formatDate(t.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="py-8 text-center text-sm text-muted">Ma'lumot yo'q</p>}
      </div>
    </div>
  )
}

function EmployeeDashboard() {
  const me = useCurrentUser()
  const { data: assignments } = useAssignments()
  const confirm = useConfirmAssignment()
  const pending = (assignments || []).filter((a) => a.status === 'pending')
  const active = (assignments || []).filter((a) => a.status === 'active')

  return (
    <div className="space-y-4 pb-6">
      <PageHeader title="Dashboard" crumbs={['Asosiy', 'Dashboard']} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card flex min-h-[240px] flex-col lg:col-span-1">
          <CardHead title="Xush kelibsiz" />
          <div className="flex flex-1 flex-col items-center justify-center px-4 pb-5">
            <IlluWelcome />
            <p className="mt-1 text-lg font-bold">{me?.name}</p>
            <p className="text-center text-[13px] text-muted">Sizga biriktirilgan buyumlar shu yerda</p>
          </div>
        </div>

        <div className="card lg:col-span-2">
          <CardHead title="Tasdiqlashingiz kerak" extra={<Pill tone={pending.length ? 'brand' : 'muted'}>{pending.length}</Pill>} />
          <div className="space-y-2 px-4 py-4">
            {pending.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl bg-amber-50/70 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{a.product?.name}</p>
                  <p className="text-xs text-muted">
                    {a.quantity} {a.product?.unit} · {formatDate(a.assignedAt)}
                  </p>
                </div>
                <PrimaryBtn onClick={() => confirm.mutate(a.id)} disabled={confirm.isPending} className="shrink-0 !px-3.5 !py-2 text-xs">
                  <CheckCircle2 size={15} /> Men oldim
                </PrimaryBtn>
              </div>
            ))}
            {!pending.length && <p className="py-8 text-center text-sm text-muted">Tasdiqlanadigan buyum yo'q</p>}
          </div>
        </div>
      </div>

      <div className="card">
        <CardHead
          title="Mendagi buyumlar"
          extra={
            <span className="flex items-center gap-2 text-[13px] text-muted">
              <ClipboardList size={16} /> {active.length}
            </span>
          }
        />
        <ul className="divide-y divide-slate-50 px-2 py-2">
          {active.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 hover:bg-slate-50">
              <div className="min-w-0">
                <p className="truncate font-semibold">{a.product?.name}</p>
                <p className="text-xs text-muted">
                  {a.assetTag} · {a.quantity} {a.product?.unit} · biriktirilgan: {formatDate(a.assignedAt)}
                </p>
              </div>
              <Badge tone="green">Foydalanishda</Badge>
            </li>
          ))}
          {!active.length && !pending.length && (
            <p className="py-10 text-center text-sm text-muted">Hozircha sizga hech narsa biriktirilmagan</p>
          )}
        </ul>
      </div>
    </div>
  )
}
