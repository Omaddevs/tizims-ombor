import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Barcode,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Gift,
  Minus,
  Package,
  PackageMinus,
  Plus,
  Printer,
  ScanLine,
  Search,
  Send,
  ShoppingCart,
  Tag,
  Trash2,
  UserRound,
  Wrench,
} from 'lucide-react'
import { useCreateAssignment, useCreateTransaction, useEmployees, useProducts, useTransactions } from '../api/queries'
import { Badge, ErrorNote, Field, PageHeader, PrimaryBtn, SecondaryBtn, cn, inputClass } from '../components/ui'
import { Select } from '../components/Select'
import { FileDrop } from '../components/FileDrop'
import { BarcodeScanner } from '../components/BarcodeScanner'
import { AssignmentQrLabel } from '../components/QrLabel'
import { IlluOutbound } from '../components/illustrations'
import { CHIQUM_REASONS, formatDate, reasonLabel } from '../lib/format'

const NOTE_MAX = 500
const UNITS = ['dona', 'pachka', 'komplekt', "to'plam", 'metr', 'kg', 'litr']
const QUICK_ACTIONS = [
  { id: 'sale', title: 'Sotuv uchun chiqim', hint: 'Mijozga sotilgan mahsulot', icon: ShoppingCart, tone: 'bg-rose-50 text-rose-500' },
  { id: 'internal', title: 'Ichki ehtiyoj', hint: "Ofis, xizmat ko'rsatish va h.k.", icon: Wrench, tone: 'bg-violet-50 text-violet-600' },
  { id: 'gift', title: 'Hadya / Promo', hint: "Reklama yoki sovg'a", icon: Gift, tone: 'bg-red-50 text-red-500' },
  { id: 'damaged', title: 'Nosoz / Buzilgan', hint: 'Yaroqsiz mahsulotlar', icon: AlertTriangle, tone: 'bg-orange-50 text-orange-500' },
]

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

function txnReason(t) {
  if (t.reason) return reasonLabel(t.reason)
  const n = String(t.note || '').toLowerCase()
  if (n.includes('biriktir')) return 'Xodimga biriktirish'
  if (n.includes('sotuv')) return 'Sotuv'
  if (n.includes('nosoz') || n.includes('buzil')) return 'Nosoz'
  return n ? 'Boshqa' : 'Boshqa'
}

export default function StockOut() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('consume')
  const [product, setProduct] = useState(null)
  const [employee, setEmployee] = useState(null)
  const [barcode, setBarcode] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState('dona')
  const [reason, setReason] = useState('')
  const [date, setDate] = useState(todayInput)
  const [note, setNote] = useState('')
  const [documentUrl, setDocumentUrl] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const { data: products } = useProducts()
  const { data: employees } = useEmployees()
  const { data: outTxns } = useTransactions({ type: 'out' })
  const createTxn = useCreateTransaction()
  const createAssignment = useCreateAssignment()
  const pending = createTxn.isPending || createAssignment.isPending

  const unitOptions = useMemo(() => {
    const extra = (products || []).map((p) => p.unit).filter(Boolean)
    return [...new Set([...UNITS, ...extra])].map((u) => ({ value: u, label: u }))
  }, [products])

  const reasonOptions = CHIQUM_REASONS.filter((r) => r.value !== 'assign').map((r) => ({
    value: r.value,
    label: r.label,
  }))

  const recent = (outTxns || []).slice(0, 4)
  const stock = product?.quantity ?? 0
  const stockTone = !product ? 'slate' : stock <= 0 ? 'red' : stock <= (product.minStock || 0) ? 'yellow' : 'green'

  const pickProduct = (p) => {
    setProduct(p)
    setBarcode(p?.barcode || '')
    setUnit(p?.unit || 'dona')
    setError('')
  }

  const onScan = (code) => {
    setScanning(false)
    const foundProduct = (products || []).find((p) => p.barcode === code)
    if (foundProduct) {
      pickProduct(foundProduct)
      return
    }
    if (mode === 'asset') {
      const foundEmployee = (employees || []).find((e) => e.badgeCode === code)
      if (foundEmployee) {
        setEmployee(foundEmployee)
        setError('')
        return
      }
    }
    setBarcode(code)
    setError("Shtrix-kod bo'yicha mahsulot topilmadi")
  }

  const lookupBarcode = () => {
    const code = barcode.trim()
    if (!code) return
    const found = (products || []).find((p) => p.barcode === code)
    if (found) pickProduct(found)
    else if (!product || product.barcode !== code) setError("Shtrix-kod bo'yicha mahsulot topilmadi")
  }

  const reset = () => {
    setProduct(null)
    setEmployee(null)
    setBarcode('')
    setQuantity(1)
    setUnit('dona')
    setReason('')
    setDate(todayInput())
    setNote('')
    setDocumentUrl(null)
    setScanning(false)
    setError('')
    setResult(null)
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!product) return setError('Mahsulotni tanlang')
    const qty = Number(quantity)
    if (!qty || qty < 1) return setError("Miqdor 1 dan kam bo'lmasin")
    if (qty > stock) return setError(`Omborda yetarli mahsulot yo'q (qoldiq: ${stock})`)
    if (mode === 'consume' && !reason) return setError('Chiqim sababini tanlang')
    if (mode === 'asset' && !employee) return setError('Xodimni tanlang')
    const createdAt = dateToIso(date)
    try {
      if (mode === 'consume') {
        await createTxn.mutateAsync({
          productId: product.id,
          type: 'out',
          quantity: qty,
          documentUrl,
          note: note.trim(),
          reason,
          createdAt,
        })
        setResult({ consumed: true })
      } else {
        const assignment = await createAssignment.mutateAsync({
          productId: product.id,
          employeeId: employee.id,
          quantity: qty,
          note: note.trim(),
          documentUrl,
          assignedAt: createdAt,
          reason: 'assign',
        })
        setResult({ assignment })
      }
    } catch (e2) {
      setError(e2.message)
    }
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title="Chiqim / Biriktirish"
        crumbs={['Asosiy', 'Chiqim']}
        subtitle="Ombordagi mahsulotlarni chiqimga yozing yoki xodimga biriktiring."
      />

      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="card min-w-0 p-5 sm:p-6">
          {result?.assignment ? (
            <SuccessAssign
              assignment={result.assignment}
              product={product}
              employee={employee}
              onReset={reset}
            />
          ) : result?.consumed ? (
            <SuccessConsume product={product} quantity={quantity} onReset={reset} onJournal={() => navigate('/transactions?type=out')} />
          ) : (
            <form onSubmit={submit}>
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  <PackageMinus size={20} />
                </span>
                <div>
                  <h2 className="text-[17px] font-bold text-ink">Yangi chiqim</h2>
                  <p className="mt-0.5 text-[13px] text-muted">
                    Mahsulotni chiqimga yozing yoki xodimga biriktirish uchun ma'lumotlarni to'ldiring.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-1 rounded-2xl bg-slate-100/90 p-1 sm:grid-cols-2">
                <ModeTab
                  active={mode === 'consume'}
                  icon={PackageMinus}
                  label="Chiqim (ombordan chiqarish)"
                  onClick={() => {
                    setMode('consume')
                    setEmployee(null)
                    setError('')
                  }}
                />
                <ModeTab
                  active={mode === 'asset'}
                  icon={UserRound}
                  label="Xodimga biriktirish"
                  onClick={() => {
                    setMode('asset')
                    setReason('')
                    setError('')
                  }}
                />
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <FormLabel required>Mahsulot</FormLabel>
                  <ProductPicker products={products || []} value={product} onChange={pickProduct} />
                </div>
                <div>
                  <FormLabel>Shtrix-kod (ixtiyoriy)</FormLabel>
                  <div className="flex items-center gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-50">
                      <Barcode size={16} className="shrink-0 text-slate-400" />
                      <input
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        onBlur={lookupBarcode}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            lookupBarcode()
                          }
                        }}
                        placeholder="Shtrix-kodni kiriting..."
                        className="w-full bg-transparent text-sm outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setScanning((v) => !v)}
                      className={cn(
                        'grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl border transition',
                        scanning
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-brand-300 hover:text-brand-700',
                      )}
                      aria-label="Skanerlash"
                    >
                      <ScanLine size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {scanning && (
                <div className="mt-3 max-w-xs">
                  <BarcodeScanner active={scanning} onDetected={onScan} />
                </div>
              )}

              {mode === 'asset' && (
                <div className="mt-4">
                  <FormLabel required>Xodim</FormLabel>
                  <EmployeePicker employees={employees || []} value={employee} onChange={setEmployee} />
                </div>
              )}

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <FormLabel required>Miqdor</FormLabel>
                  <QtyStepper
                    value={quantity}
                    max={product ? stock : undefined}
                    onChange={setQuantity}
                  />
                </div>
                <Field label="O'lchov birligi">
                  <Select value={unit} onChange={setUnit} options={unitOptions} />
                </Field>
                <div>
                  <FormLabel>Mavjud qoldiq</FormLabel>
                  <div
                    className={cn(
                      'flex h-[42px] items-center gap-2 rounded-xl px-3.5 text-sm font-semibold',
                      stockTone === 'green' && 'bg-emerald-50 text-emerald-700',
                      stockTone === 'yellow' && 'bg-amber-50 text-amber-700',
                      stockTone === 'red' && 'bg-rose-50 text-rose-600',
                      stockTone === 'slate' && 'bg-slate-50 text-slate-400',
                    )}
                  >
                    <Package size={16} />
                    {product ? `${stock} ${product.unit}` : '—'}
                  </div>
                </div>
              </div>

              <div className={cn('mt-4 grid gap-4', mode === 'consume' && 'sm:grid-cols-2')}>
                {mode === 'consume' && (
                  <Field label="Chiqim sababi" required>
                    <Select value={reason} onChange={setReason} options={reasonOptions} placeholder="Sababni tanlang..." />
                  </Field>
                )}
                <Field label="Sana" required>
                  <div className="relative">
                    <input type="date" className={cn(inputClass, 'date-input relative pr-10')} value={date} onChange={(e) => setDate(e.target.value)} required />
                    <CalendarDays size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Izoh (ixtiyoriy)">
                  <textarea
                    className={cn(inputClass, 'min-h-[88px] resize-y')}
                    maxLength={NOTE_MAX}
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
                    placeholder="Qo'shimcha ma'lumot kiriting..."
                  />
                </Field>
                <p className="mt-1 text-right text-[11px] text-muted">
                  {note.length}/{NOTE_MAX}
                </p>
              </div>

              <div className="mt-2">
                <FormLabel>Fayl biriktirish (ixtiyoriy)</FormLabel>
                <FileDrop value={documentUrl} onChange={setDocumentUrl} />
              </div>

              <ErrorNote>{error}</ErrorNote>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <SecondaryBtn type="button" onClick={reset}>
                  <Trash2 size={16} /> Tozalash
                </SecondaryBtn>
                <PrimaryBtn type="submit" disabled={pending}>
                  {mode === 'asset' ? (
                    <>
                      <Printer size={16} /> {pending ? 'Saqlanmoqda...' : 'Biriktirishni tasdiqlash'}
                    </>
                  ) : (
                    <>
                      <Send size={16} /> {pending ? 'Saqlanmoqda...' : 'Chiqimni tasdiqlash'}
                    </>
                  )}
                </PrimaryBtn>
              </div>
            </form>
          )}
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-4">
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <IlluOutbound className="h-[72px] w-[84px] shrink-0" />
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-semibold text-ink">Chiqim nima?</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                  Chiqim — bu mahsulotning ombordan chiqarilishi. U sotuv, ichki ehtiyoj, nosozlik, hadya yoki boshqa
                  sabablarga ko'ra amalga oshiriladi.
                </p>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-[15px] font-semibold text-ink">Tezkor amallar</h3>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {QUICK_ACTIONS.map((a) => {
                const Icon = a.icon
                const active = mode === 'consume' && reason === a.id
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      setMode('consume')
                      setReason(a.id)
                      setError('')
                    }}
                    className={cn(
                      'rounded-2xl border p-3 text-left transition hover:shadow-sm',
                      active ? 'border-brand-200 bg-brand-50/60 ring-2 ring-brand-100' : 'border-slate-100 bg-white hover:bg-slate-50',
                    )}
                  >
                    <span className={cn('grid h-9 w-9 place-items-center rounded-xl', a.tone)}>
                      <Icon size={16} />
                    </span>
                    <p className="mt-2 text-[13px] font-semibold leading-tight text-ink">{a.title}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted">{a.hint}</p>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[15px] font-semibold text-ink">So'nggi chiqimlar</h3>
              <Link to="/transactions?type=out" className="text-[12px] font-semibold text-brand-600 hover:text-brand-700">
                Barchasini ko'rish
              </Link>
            </div>
            {recent.length ? (
              <ul className="mt-3 space-y-1">
                {recent.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 rounded-xl px-1 py-2">
                    <ProductThumb url={t.product?.photoUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{t.product?.name || '—'}</p>
                      <p className="text-[11px] text-muted">{formatDate(t.createdAt, true)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-rose-500">
                        -{t.quantity} {t.product?.unit || ''}
                      </p>
                      <p className="text-[11px] text-muted">{txnReason(t)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-center text-[13px] text-muted">Hozircha chiqim yo'q</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

function SuccessConsume({ product, quantity, onReset, onJournal }) {
  return (
    <div className="py-6 text-center">
      <CheckCircle2 size={40} className="mx-auto text-emerald-600" />
      <h2 className="mt-3 text-lg font-bold">Chiqim qayd etildi</h2>
      <p className="mt-1 text-sm text-muted">
        {product?.name}: -{quantity} {product?.unit}
      </p>
      <div className="mt-5 flex gap-2">
        <SecondaryBtn className="flex-1" onClick={onJournal}>
          Jurnal
        </SecondaryBtn>
        <PrimaryBtn className="flex-1" onClick={onReset}>
          Yana chiqim qilish
        </PrimaryBtn>
      </div>
    </div>
  )
}

function SuccessAssign({ assignment, product, employee, onReset }) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <Tag size={36} className="mx-auto text-brand-700" />
        <h2 className="mt-3 text-lg font-bold">Buyum biriktirildi</h2>
        <p className="mt-1 text-sm text-muted">
          {employee?.userId
            ? 'Xodimga bildirishnoma yuborildi. U o\'z hisobidan "Men oldim" tugmasi bilan tasdiqlaydi.'
            : "Xodimning tizimda hisobi yo'q — qabul qilganini hozir shu yerda tasdiqlang (guvoh sifatida)."}
        </p>
      </div>
      <AssignmentQrLabel assignment={assignment} product={product} employee={employee} />
      <SecondaryBtn className="w-full" onClick={onReset}>
        Yangi chiqim / biriktirish
      </SecondaryBtn>
    </div>
  )
}

function ModeTab({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
        active ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-slate-800',
      )}
    >
      <Icon size={16} />
      {label}
    </button>
  )
}

function FormLabel({ children, required }) {
  return (
    <span className="mb-1.5 block text-sm font-medium text-slate-600">
      {children}
      {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
    </span>
  )
}

function QtyStepper({ value, onChange, max }) {
  const n = Number(value) || 1
  const dec = () => onChange(Math.max(1, n - 1))
  const inc = () => onChange(max != null ? Math.min(max, n + 1) : n + 1)
  return (
    <div className="flex h-[42px] items-center rounded-xl border border-slate-200 bg-white">
      <button type="button" onClick={dec} className="grid h-full w-11 place-items-center text-slate-400 hover:text-brand-700" aria-label="Kamaytirish">
        <Minus size={16} />
      </button>
      <input
        type="number"
        min="1"
        max={max}
        value={value}
        onChange={(e) => {
          const next = Number(e.target.value)
          if (!Number.isFinite(next)) return onChange(e.target.value)
          if (next < 1) return onChange(1)
          if (max != null && next > max) return onChange(max)
          onChange(next)
        }}
        className="w-full bg-transparent text-center text-sm font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button type="button" onClick={inc} className="grid h-full w-11 place-items-center text-slate-400 hover:text-brand-700" aria-label="Oshirish">
        <Plus size={16} />
      </button>
    </div>
  )
}

function ProductPicker({ products, value, onChange }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return products.slice(0, 40)
    return products.filter((p) => p.name.toLowerCase().includes(s) || String(p.barcode || '').includes(s)).slice(0, 40)
  }, [products, q])

  return (
    <div className="relative" ref={ref}>
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border bg-white px-3.5 py-2.5 transition',
          open ? 'border-brand-500 ring-4 ring-brand-50' : 'border-slate-200',
        )}
      >
        <Search size={16} className="shrink-0 text-slate-400" />
        {value && !open ? (
          <button type="button" onClick={() => { setOpen(true); setQ(''); setTimeout(() => inputRef.current?.focus(), 0) }} className="min-w-0 flex-1 truncate text-left text-sm font-medium">
            {value.name}
          </button>
        ) : (
          <input
            ref={inputRef}
            value={open ? q : value?.name || ''}
            onChange={(e) => {
              setQ(e.target.value)
              if (value) onChange(null)
            }}
            onFocus={() => setOpen(true)}
            placeholder="Mahsulotni qidiring..."
            className="w-full bg-transparent text-sm outline-none"
          />
        )}
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v)
            if (!open) setTimeout(() => inputRef.current?.focus(), 0)
          }}
          className="shrink-0 text-slate-400"
          aria-label="Ro'yxat"
        >
          <ChevronDown size={16} className={cn('transition', open && 'rotate-180')} />
        </button>
      </div>
      {open && (
        <ul className="absolute z-40 mt-1.5 max-h-64 w-full overflow-y-auto rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-slate-100">
          {list.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(p)
                  setQ('')
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
  const [q, setQ] = useState('')
  const ref = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return employees.slice(0, 40)
    return employees.filter(
      (e) => e.fullName.toLowerCase().includes(s) || String(e.badgeCode || '').toLowerCase() === s || String(e.department || '').toLowerCase().includes(s),
    )
  }, [employees, q])

  return (
    <div className="relative" ref={ref}>
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border bg-white px-3.5 py-2.5 transition',
          open ? 'border-brand-500 ring-4 ring-brand-50' : 'border-slate-200',
        )}
      >
        <UserRound size={16} className="shrink-0 text-slate-400" />
        {value && !open ? (
          <button type="button" onClick={() => { setOpen(true); setQ(''); setTimeout(() => inputRef.current?.focus(), 0) }} className="min-w-0 flex-1 truncate text-left text-sm font-medium">
            {value.fullName}
          </button>
        ) : (
          <input
            ref={inputRef}
            value={open ? q : value?.fullName || ''}
            onChange={(e) => {
              setQ(e.target.value)
              if (value) onChange(null)
            }}
            onFocus={() => setOpen(true)}
            placeholder="Xodimni qidiring yoki badge kodi..."
            className="w-full bg-transparent text-sm outline-none"
          />
        )}
        <ChevronDown size={16} className={cn('shrink-0 text-slate-400 transition', open && 'rotate-180')} />
      </div>
      {open && (
        <ul className="absolute z-40 mt-1.5 max-h-64 w-full overflow-y-auto rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-slate-100">
          {list.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(e)
                  setQ('')
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

function ProductThumb({ url }) {
  if (url) return <img src={url} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-slate-100" />
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-400">
      <Package size={16} />
    </span>
  )
}
