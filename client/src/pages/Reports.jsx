import { useEffect, useMemo, useRef, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Boxes,
  CalendarDays,
  ChevronDown,
  Coins,
  FileSpreadsheet,
  FileText,
  FileType2,
  Flame,
  PackageMinus,
  PackagePlus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useCategories, useProducts, useReportSummary, useTransactions } from '../api/queries'
import { Select } from '../components/Select'
import { DataTable } from '../components/DataTable'
import { Avatar, PageHeader, ProgressBar, SecondaryBtn, StatCard, Tabs, cn } from '../components/ui'
import { formatDate, formatSum } from '../lib/format'
import { exportReportPdf } from '../lib/pdf'
import { exportReportExcel } from '../lib/excel'
import { exportReportDoc } from '../lib/doc'

const TABS = [
  { id: 'umumiy', label: 'Umumiy' },
  { id: 'kirim', label: 'Kirim' },
  { id: 'chiqim', label: 'Chiqim' },
  { id: 'mahsulotlar', label: 'Mahsulotlar' },
  { id: 'xodimlar', label: 'Xodimlar' },
  { id: 'kategoriyalar', label: 'Kategoriyalar' },
  { id: 'harakatlar', label: 'Harakatlar' },
]

const CATEGORY_COLORS = ['#3b6cf5', '#10b981', '#f59e0b', '#8b5cf6', '#94a3b8', '#f43f5e']

function toInputDate(d) {
  const dt = new Date(d)
  const pad = (n) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}

function deltaPct(curr, prev) {
  if (!prev) return curr > 0 ? 100 : curr < 0 ? -100 : null
  return Math.round(((curr - prev) / prev) * 100)
}

function formatCompact(value) {
  const n = Number(value) || 0
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${Math.round(n / 1000)}k`
  return String(n)
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
    <div className="relative w-full sm:w-auto" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 sm:w-auto sm:justify-start"
      >
        <CalendarDays size={15} className="shrink-0 text-slate-400" />
        <span className="truncate">
          {formatDate(range.from)} – {formatDate(range.to)}
        </span>
        <ChevronDown size={14} className={cn('shrink-0 text-slate-400 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-[min(18rem,calc(100vw-2rem))] rounded-2xl bg-white p-3.5 shadow-xl ring-1 ring-slate-100">
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

function TrendCard({ icon: Icon, tone, title, value, sub, delta }) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-rose-50 text-rose-500',
    blue: 'bg-brand-50 text-brand-600',
    amber: 'bg-amber-50 text-amber-600',
  }
  const positive = delta != null && delta >= 0
  return (
    <div className="card relative overflow-hidden p-5">
      <BarChart3 size={64} strokeWidth={1.5} className="pointer-events-none absolute -bottom-3 -right-3 text-slate-50" />
      <div className="relative flex items-start justify-between gap-2">
        <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', tones[tone])}>
          <Icon size={18} />
        </div>
        {delta != null && (
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold',
              positive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500',
            )}
          >
            {positive ? <ArrowUp size={11} strokeWidth={2.5} /> : <ArrowDown size={11} strokeWidth={2.5} />}
            {positive ? '+' : ''}
            {delta}%
          </span>
        )}
      </div>
      <p className="relative mt-3 text-[13px] text-muted">{title}</p>
      <p className="relative mt-1 truncate text-2xl font-bold leading-tight text-ink">{value}</p>
      {sub && <p className="relative mt-1 text-xs font-medium text-muted">{sub}</p>}
    </div>
  )
}

function ChartTooltip({ active, payload, label, metric }) {
  if (!active || !payload?.length) return null
  const inKey = metric === 'sum' ? 'inSum' : 'inQty'
  const outKey = metric === 'sum' ? 'outSum' : 'outQty'
  const inRow = payload.find((p) => p.dataKey === inKey)
  const outRow = payload.find((p) => p.dataKey === outKey)
  const fmt = (v) => (metric === 'sum' ? formatSum(v) : `${v ?? 0}`)
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-2.5 text-xs shadow-xl">
      <p className="mb-1.5 font-semibold text-ink">{formatDate(label)}</p>
      <p className="flex items-center gap-1.5 font-medium text-emerald-600">
        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Kirim: {fmt(inRow?.value)}
      </p>
      <p className="mt-1 flex items-center gap-1.5 font-medium text-rose-500">
        <span className="h-2 w-2 rounded-full bg-rose-500" /> Chiqim: {fmt(outRow?.value)}
      </p>
    </div>
  )
}

export default function Reports() {
  const [range, setRange] = useDateRange()
  const [tab, setTab] = useState('umumiy')
  const [chartMetric, setChartMetric] = useState('qty')

  const { fromISO, toISO, prevFromISO, prevToISO } = useMemo(() => {
    const days = Math.max(1, Math.round((range.to - range.from) / 86400000) + 1)
    const prevTo = new Date(range.from.getTime() - 1000)
    const prevFrom = new Date(prevTo.getTime() - (days - 1) * 86400000)
    prevFrom.setHours(0, 0, 0, 0)
    return {
      fromISO: range.from.toISOString(),
      toISO: range.to.toISOString(),
      prevFromISO: prevFrom.toISOString(),
      prevToISO: prevTo.toISOString(),
    }
  }, [range])

  const { data, isLoading } = useReportSummary({ from: fromISO, to: toISO })
  const { data: prevData } = useReportSummary({ from: prevFromISO, to: prevToISO })
  const { data: products } = useProducts()
  const { data: categories } = useCategories()
  const { data: transactions } = useTransactions({ from: fromISO, to: toISO })

  const filenameBase = `hisobot-${toInputDate(range.from)}_${toInputDate(range.to)}`

  const inQtyDelta = deltaPct(data?.totals?.inQty, prevData?.totals?.inQty)
  const outQtyDelta = deltaPct(data?.totals?.outQty, prevData?.totals?.outQty)
  const inSumDelta = deltaPct(data?.totals?.inSum, prevData?.totals?.inSum)
  const outSumDelta = deltaPct(data?.totals?.outSum, prevData?.totals?.outSum)

  const topProducts = (data?.byProduct || []).slice(0, 5)
  const topEmployees = (data?.byEmployee || []).slice(0, 5)
  const maxEmployeeSum = Math.max(1, ...topEmployees.map((e) => e.outSum))

  const categoryRows = useMemo(() => {
    const map = new Map()
    ;(data?.byProduct || []).forEach((row) => {
      const product = (products || []).find((p) => p.id === row.productId)
      const cat = (categories || []).find((c) => c.id === product?.categoryId)
      const id = cat?.id || 'none'
      const name = cat?.name || 'Boshqa'
      const entry = map.get(id) || { id, name, inQty: 0, outQty: 0, inSum: 0, outSum: 0 }
      entry.inQty += row.inQty
      entry.outQty += row.outQty
      entry.inSum += row.inSum
      entry.outSum += row.outSum
      map.set(id, entry)
    })
    return [...map.values()].sort((a, b) => b.outSum - a.outSum)
  }, [data, products, categories])

  const categoryChartData = useMemo(() => {
    if (categoryRows.length <= 5) return categoryRows
    const top = categoryRows.slice(0, 4)
    const rest = categoryRows.slice(4)
    const other = rest.reduce(
      (acc, c) => ({ ...acc, outSum: acc.outSum + c.outSum, outQty: acc.outQty + c.outQty }),
      { id: 'other', name: 'Boshqa', outSum: 0, outQty: 0 },
    )
    return [...top, other]
  }, [categoryRows])

  const totalOutSum = data?.totals?.outSum || 0

  const insights = useMemo(() => {
    const txns = transactions || []
    const ins = txns.filter((t) => t.type === 'in').sort((a, b) => b.quantity - a.quantity)
    const outs = txns
      .filter((t) => t.type === 'out')
      .sort((a, b) => b.quantity * (b.product?.price || 0) - a.quantity * (a.product?.price || 0))
    const dayCounts = new Map()
    txns.forEach((t) => {
      const day = t.createdAt.slice(0, 10)
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1)
    })
    let busiestDay = null
    for (const [date, count] of dayCounts) {
      if (!busiestDay || count > busiestDay.count) busiestDay = { date, count }
    }
    return { biggestIn: ins[0] || null, biggestOut: outs[0] || null, busiestDay }
  }, [transactions])

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title="Hisobotlar"
        crumbs={['Asosiy', 'Hisobotlar']}
        subtitle="Ombor harakatlari bo'yicha batafsil tahlil va statistik ma'lumotlar."
        action={
          data ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <div className="flex flex-wrap items-center gap-2">
                <SecondaryBtn className="flex-1 sm:flex-none" onClick={() => exportReportPdf(data, `${filenameBase}.pdf`)}>
                  <FileText size={15} /> PDF
                </SecondaryBtn>
                <SecondaryBtn className="flex-1 sm:flex-none" onClick={() => exportReportExcel(data, `${filenameBase}.xlsx`)}>
                  <FileSpreadsheet size={15} /> Excel
                </SecondaryBtn>
                <SecondaryBtn className="flex-1 sm:flex-none" onClick={() => exportReportDoc(data, `${filenameBase}.docx`)}>
                  <FileType2 size={15} /> DOC
                </SecondaryBtn>
              </div>
              <DateRangePicker range={range} onChange={setRange} />
            </div>
          ) : (
            <DateRangePicker range={range} onChange={setRange} />
          )
        }
      />

      <Tabs value={tab} onChange={setTab} items={TABS} />

      {isLoading && <p className="py-10 text-center text-sm text-muted">Yuklanmoqda...</p>}

      {data && (
        <>
          {tab === 'umumiy' && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <TrendCard
                  icon={TrendingUp}
                  tone="green"
                  title="Kirim (miqdor)"
                  value={data.totals.inQty}
                  sub={`${data.totals.inCount} ta harakat`}
                  delta={inQtyDelta}
                />
                <TrendCard
                  icon={TrendingDown}
                  tone="red"
                  title="Chiqim (miqdor)"
                  value={data.totals.outQty}
                  sub={`${data.totals.outCount} ta harakat`}
                  delta={outQtyDelta}
                />
                <TrendCard
                  icon={Coins}
                  tone="blue"
                  title="Kirim summasi"
                  value={formatSum(data.totals.inSum)}
                  sub={`Oldingi davr: ${formatSum(prevData?.totals?.inSum)}`}
                  delta={inSumDelta}
                />
                <TrendCard
                  icon={Coins}
                  tone="amber"
                  title="Chiqim summasi"
                  value={formatSum(data.totals.outSum)}
                  sub={`Oldingi davr: ${formatSum(prevData?.totals?.outSum)}`}
                  delta={outSumDelta}
                />
              </div>

              <div className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-[15px] font-semibold text-ink">Kunlik dinamika</h3>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-3 text-[12px] font-medium text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Kirim
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-rose-500" /> Chiqim
                      </span>
                    </span>
                    <Select
                      variant="pill"
                      value={chartMetric}
                      onChange={setChartMetric}
                      options={[
                        { value: 'qty', label: 'Miqdor' },
                        { value: 'sum', label: 'Summasi' },
                      ]}
                    />
                  </div>
                </div>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.byDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        tickFormatter={(d) => d.slice(5)}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={20}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                        tickFormatter={(v) => (chartMetric === 'sum' ? formatCompact(v) : v)}
                      />
                      <Tooltip content={<ChartTooltip metric={chartMetric} />} />
                      <Bar
                        dataKey={chartMetric === 'sum' ? 'inSum' : 'inQty'}
                        name="Kirim"
                        fill="#10b981"
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar
                        dataKey={chartMetric === 'sum' ? 'outSum' : 'outQty'}
                        name="Chiqim"
                        fill="#f43f5e"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="card overflow-hidden">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 p-4">
                    <h3 className="font-bold">Mahsulotlar kesimida</h3>
                    <button onClick={() => setTab('mahsulotlar')} className="shrink-0 text-xs font-semibold text-brand-600">
                      Barchasini ko'rish →
                    </button>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {topProducts.map((p, i) => (
                      <li key={p.productId} className="flex items-center gap-3 px-4 py-3 text-sm">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-slate-100 text-[11px] font-bold text-slate-500">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                        <span className="shrink-0 text-xs text-muted">
                          +{p.inQty} / -{p.outQty} {p.unit}
                        </span>
                      </li>
                    ))}
                    {!topProducts.length && <p className="py-8 text-center text-sm text-muted">Ma'lumot yo'q</p>}
                  </ul>
                </div>

                <div className="card overflow-hidden">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 p-4">
                    <h3 className="font-bold">Xodimlar kesimida (chiqim)</h3>
                    <button onClick={() => setTab('xodimlar')} className="shrink-0 text-xs font-semibold text-brand-600">
                      Barchasini ko'rish →
                    </button>
                  </div>
                  <ul className="divide-y divide-slate-100 px-4">
                    {topEmployees.map((e) => (
                      <li key={e.employeeId} className="flex items-center gap-3 py-3">
                        <Avatar name={e.fullName} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-[13px] font-medium">{e.fullName}</p>
                            <span className="shrink-0 text-xs font-semibold">{formatSum(e.outSum)}</span>
                          </div>
                          <p className="mb-1 truncate text-[11px] text-muted">{e.department}</p>
                          <ProgressBar value={(e.outSum / maxEmployeeSum) * 100} tone="bg-rose-500" />
                        </div>
                      </li>
                    ))}
                    {!topEmployees.length && <p className="py-8 text-center text-sm text-muted">Ma'lumot yo'q</p>}
                  </ul>
                </div>

                <div className="card p-5">
                  <h3 className="font-bold">Top kategoriyalar (chiqim)</h3>
                  {categoryChartData.length && totalOutSum ? (
                    <div className="mt-3 flex items-center gap-4">
                      <div className="relative h-36 w-36 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoryChartData}
                              dataKey="outSum"
                              nameKey="name"
                              innerRadius={44}
                              outerRadius={66}
                              paddingAngle={2}
                              stroke="none"
                            >
                              {categoryChartData.map((entry, i) => (
                                <Cell key={entry.id} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                          <p className="text-lg font-bold leading-tight text-ink">{formatCompact(totalOutSum)}</p>
                          <p className="text-[10px] text-muted">so'm</p>
                        </div>
                      </div>
                      <ul className="min-w-0 flex-1 space-y-2">
                        {categoryChartData.map((c, i) => (
                          <li key={c.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                            <span className="flex min-w-0 items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                              />
                              <span className="truncate text-slate-600">{c.name}</span>
                            </span>
                            <span className="shrink-0 font-semibold text-ink">
                              {Math.round((c.outSum / totalOutSum) * 100)}%
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="py-14 text-center text-[13px] text-muted">Ushbu davrda chiqim bo'lmagan</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="card flex items-center gap-3 p-5">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <TrendingUp size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] text-muted">Eng katta kirim</p>
                    {insights.biggestIn ? (
                      <>
                        <p className="truncate text-[14px] font-semibold text-ink">{insights.biggestIn.product?.name || '—'}</p>
                        <p className="text-xs text-muted">
                          {insights.biggestIn.quantity} {insights.biggestIn.product?.unit || ''} · {formatDate(insights.biggestIn.createdAt)}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-muted">Ma'lumot yo'q</p>
                    )}
                  </div>
                </div>

                <div className="card flex items-center gap-3 p-5">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-500">
                    <TrendingDown size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] text-muted">Eng katta chiqim</p>
                    {insights.biggestOut ? (
                      <>
                        <p className="truncate text-[14px] font-semibold text-ink">{insights.biggestOut.product?.name || '—'}</p>
                        <p className="text-xs text-muted">
                          {formatSum(insights.biggestOut.quantity * (insights.biggestOut.product?.price || 0))} ·{' '}
                          {formatDate(insights.biggestOut.createdAt)}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-muted">Ma'lumot yo'q</p>
                    )}
                  </div>
                </div>

                <div className="card flex items-center gap-3 p-5">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                    <Flame size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] text-muted">Eng faol kun</p>
                    {insights.busiestDay ? (
                      <>
                        <p className="truncate text-[14px] font-semibold text-ink">{formatDate(insights.busiestDay.date)}</p>
                        <p className="text-xs text-muted">Jami {insights.busiestDay.count} ta operatsiya</p>
                      </>
                    ) : (
                      <p className="text-xs text-muted">Ma'lumot yo'q</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'kirim' && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard title="Kirim soni" value={data.totals.inCount} sub="ta harakat" icon={PackagePlus} tone="green" />
                <StatCard title="Kirim miqdori" value={data.totals.inQty} icon={Boxes} tone="green" />
                <StatCard title="Kirim summasi" value={formatSum(data.totals.inSum)} icon={Coins} tone="green" />
              </div>
              <DataTable
                empty="Ushbu davrda kirim bo'lmagan"
                rows={(data.byProduct || []).filter((p) => p.inQty > 0).sort((a, b) => b.inQty - a.inQty)}
                keyField="productId"
                columns={[
                  { key: 'name', label: 'Mahsulot', render: (r) => r.name },
                  { key: 'qty', label: 'Miqdor', render: (r) => `${r.inQty} ${r.unit}` },
                  { key: 'sum', label: 'Summasi', render: (r) => formatSum(r.inSum) },
                ]}
              />
            </div>
          )}

          {tab === 'chiqim' && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard title="Chiqim soni" value={data.totals.outCount} sub="ta harakat" icon={PackageMinus} tone="red" />
                <StatCard title="Chiqim miqdori" value={data.totals.outQty} icon={Boxes} tone="red" />
                <StatCard title="Chiqim summasi" value={formatSum(data.totals.outSum)} icon={Coins} tone="red" />
              </div>
              <DataTable
                empty="Ushbu davrda chiqim bo'lmagan"
                rows={(data.byProduct || []).filter((p) => p.outQty > 0).sort((a, b) => b.outQty - a.outQty)}
                keyField="productId"
                columns={[
                  { key: 'name', label: 'Mahsulot', render: (r) => r.name },
                  { key: 'qty', label: 'Miqdor', render: (r) => `${r.outQty} ${r.unit}` },
                  { key: 'sum', label: 'Summasi', render: (r) => formatSum(r.outSum) },
                ]}
              />
              <DataTable
                empty="Ushbu davrda xodimlar bo'yicha chiqim yo'q"
                rows={data.byEmployee}
                keyField="employeeId"
                columns={[
                  { key: 'fullName', label: 'Xodim', render: (r) => r.fullName },
                  { key: 'department', label: "Bo'lim", render: (r) => r.department || '—' },
                  { key: 'items', label: 'Operatsiyalar', render: (r) => r.items },
                  { key: 'outQty', label: 'Miqdor', render: (r) => r.outQty },
                  { key: 'outSum', label: 'Summasi', render: (r) => formatSum(r.outSum) },
                ]}
              />
            </div>
          )}

          {tab === 'mahsulotlar' && (
            <DataTable
              empty="Ma'lumot yo'q"
              rows={data.byProduct}
              keyField="productId"
              columns={[
                { key: 'name', label: 'Mahsulot', render: (r) => r.name },
                { key: 'unit', label: 'Birlik', render: (r) => r.unit },
                { key: 'inQty', label: 'Kirim miqdori', render: (r) => r.inQty },
                { key: 'inSum', label: 'Kirim summasi', render: (r) => formatSum(r.inSum) },
                { key: 'outQty', label: 'Chiqim miqdori', render: (r) => r.outQty },
                { key: 'outSum', label: 'Chiqim summasi', render: (r) => formatSum(r.outSum) },
              ]}
            />
          )}

          {tab === 'xodimlar' && (
            <DataTable
              empty="Ma'lumot yo'q"
              rows={data.byEmployee}
              keyField="employeeId"
              columns={[
                {
                  key: 'fullName',
                  label: 'Xodim',
                  render: (r) => (
                    <span className="flex items-center gap-2.5">
                      <Avatar name={r.fullName} size="sm" />
                      <span className="font-medium">{r.fullName}</span>
                    </span>
                  ),
                },
                { key: 'department', label: "Bo'lim", render: (r) => r.department || '—' },
                { key: 'items', label: 'Operatsiyalar', render: (r) => r.items },
                { key: 'outQty', label: 'Chiqim miqdori', render: (r) => r.outQty },
                { key: 'outSum', label: 'Chiqim summasi', render: (r) => formatSum(r.outSum) },
              ]}
            />
          )}

          {tab === 'kategoriyalar' && (
            <div className="space-y-4">
              <div className="card p-5">
                <h3 className="font-bold">Kategoriyalar bo'yicha chiqim ulushi</h3>
                {categoryChartData.length && totalOutSum ? (
                  <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row">
                    <div className="relative h-44 w-44 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryChartData}
                            dataKey="outSum"
                            nameKey="name"
                            innerRadius={54}
                            outerRadius={80}
                            paddingAngle={2}
                            stroke="none"
                          >
                            {categoryChartData.map((entry, i) => (
                              <Cell key={entry.id} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-xl font-bold leading-tight text-ink">{formatCompact(totalOutSum)}</p>
                        <p className="text-[11px] text-muted">so'm</p>
                      </div>
                    </div>
                    <ul className="w-full min-w-0 flex-1 space-y-2.5">
                      {categoryChartData.map((c, i) => (
                        <li key={c.id} className="flex items-center justify-between gap-2 text-[13px]">
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                            />
                            <span className="truncate text-slate-600">{c.name}</span>
                          </span>
                          <span className="shrink-0 font-semibold text-ink">{Math.round((c.outSum / totalOutSum) * 100)}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="py-14 text-center text-[13px] text-muted">Ushbu davrda chiqim bo'lmagan</p>
                )}
              </div>
              <DataTable
                empty="Ma'lumot yo'q"
                rows={categoryRows}
                columns={[
                  { key: 'name', label: 'Kategoriya', render: (r) => r.name },
                  { key: 'inQty', label: 'Kirim miqdori', render: (r) => r.inQty },
                  { key: 'inSum', label: 'Kirim summasi', render: (r) => formatSum(r.inSum) },
                  { key: 'outQty', label: 'Chiqim miqdori', render: (r) => r.outQty },
                  { key: 'outSum', label: 'Chiqim summasi', render: (r) => formatSum(r.outSum) },
                ]}
              />
            </div>
          )}

          {tab === 'harakatlar' && (
            <DataTable
              empty="Ushbu davrda harakat yo'q"
              rows={(transactions || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))}
              columns={[
                {
                  key: 'type',
                  label: 'Tur',
                  render: (r) => (
                    <span className={cn('inline-flex items-center gap-1.5 font-semibold', r.type === 'in' ? 'text-emerald-600' : 'text-rose-600')}>
                      {r.type === 'in' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {r.type === 'in' ? 'Kirim' : 'Chiqim'}
                    </span>
                  ),
                },
                { key: 'product', label: 'Mahsulot', render: (r) => r.product?.name || '—' },
                { key: 'quantity', label: 'Miqdor', render: (r) => `${r.quantity} ${r.product?.unit || ''}` },
                { key: 'sum', label: 'Summasi', render: (r) => formatSum(r.quantity * (r.product?.price || 0)) },
                { key: 'employee', label: 'Xodim', render: (r) => r.employee?.fullName || '—' },
                { key: 'createdAt', label: 'Sana', render: (r) => formatDate(r.createdAt, true) },
              ]}
            />
          )}
        </>
      )}
    </div>
  )
}
