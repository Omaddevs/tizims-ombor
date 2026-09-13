import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  Barcode,
  Camera,
  CheckCircle2,
  ChevronRight,
  DoorOpen,
  Image as ImageIcon,
  Keyboard,
  Loader2,
  Package,
  Plus,
  QrCode,
  RotateCcw,
  ScanBarcode,
  Smartphone,
  UserRound,
} from 'lucide-react'
import {
  useAssignments,
  useCategories,
  useReturnAssignment,
  useScanLookup,
  useTransactions,
} from '../api/queries'
import { BarcodeScanner, scanImageFile } from '../components/BarcodeScanner'
import { PhonePairScan } from '../components/PhonePairScan'
import { Badge, PageHeader, PrimaryBtn, SecondaryBtn, cn, inputClass } from '../components/ui'
import { formatDate, formatSum } from '../lib/format'
import { roomTitle } from '../lib/assignment'

const HISTORY_KEY = 'tizims.scanHistory'
const TABS = [
  { id: 'camera', label: 'Kamera orqali skanerlash', icon: Camera },
  { id: 'phone', label: 'Telefondan skanerlash', icon: Smartphone },
  { id: 'file', label: 'Fayl orqali skanerlash', icon: ImageIcon },
  { id: 'manual', label: 'QR/Barcode kiritish', icon: Barcode },
]
const TAB_SHORT = { camera: 'Kamera', phone: 'Telefon', file: 'Fayl', manual: 'Kod' }

// USB/Bluetooth 2D shtrix-kod skanerlari brauzerga klaviatura sifatida
// ulanadi: kodni juda tez (odatiy inson terishidan ancha tezroq) bosib,
// oxirida Enter yuboradi. Manual tab allaqachon oddiy input orqali buni
// qo'llab-quvvatlaydi; boshqa tablardayam ishlashi uchun global burst
// tinglovchisi kerak — inputga yozilayotgan matnga aralashmasligi uchun
// faqat fokus biror matn maydonida bo'lmaganda ishlaydi.
function useHardwareScannerListener(enabled, onScan) {
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  useEffect(() => {
    if (!enabled) return undefined
    let buffer = ''
    let lastAt = 0
    const BURST_GAP_MS = 60

    const onKeyDown = (e) => {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return

      const now = Date.now()
      if (now - lastAt > BURST_GAP_MS) buffer = ''
      lastAt = now

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          e.preventDefault()
          onScanRef.current?.(buffer)
        }
        buffer = ''
        return
      }
      if (e.key.length === 1) buffer += e.key
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}

function loadHistory() {
  try {
    const rows = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

function saveHistory(rows) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(rows.slice(0, 20)))
}

function historyFromLookup(code, data, transactions) {
  const at = new Date().toISOString()
  if (data.kind === 'product') {
    const last = (transactions || []).find((t) => t.productId === data.product.id)
    const badge = last?.type === 'out' ? 'Chiqim' : last?.type === 'in' ? 'Kirim' : 'Mahsulot'
    const tone = last?.type === 'out' ? 'red' : 'green'
    return {
      id: `scan_${Date.now()}`,
      code,
      kind: 'product',
      title: data.product.name,
      barcode: data.product.barcode,
      photoUrl: data.product.photoUrl,
      at,
      badge,
      tone,
    }
  }
  if (data.kind === 'employee') {
    return {
      id: `scan_${Date.now()}`,
      code,
      kind: 'employee',
      title: data.employee.fullName,
      barcode: data.employee.badgeCode,
      photoUrl: data.employee.photoUrl,
      at,
      badge: 'Xodim',
      tone: 'blue',
    }
  }
  if (data.kind === 'assignment') {
    const where = data.room ? roomTitle(data.room) : data.employee?.fullName
    return {
      id: `scan_${Date.now()}`,
      code,
      kind: 'assignment',
      title: data.product?.name || 'Biriktirma',
      barcode: data.assignment.assetTag,
      photoUrl: data.product?.photoUrl,
      at,
      badge: where ? `Biriktirildi · ${where}` : 'Biriktirildi',
      tone: 'violet',
    }
  }
  if (data.kind === 'room') {
    return {
      id: `scan_${Date.now()}`,
      code,
      kind: 'room',
      title: roomTitle(data.room),
      barcode: data.room.number,
      photoUrl: null,
      at,
      badge: 'Xona',
      tone: 'blue',
    }
  }
  return null
}

function Thumb({ url, kind }) {
  if (url) return <img src={url} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover ring-1 ring-slate-100" />
  const Icon = kind === 'employee' ? UserRound : kind === 'room' ? DoorOpen : Package
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-400">
      <Icon size={18} />
    </span>
  )
}

const BADGE_CLASS = {
  green: 'bg-emerald-50 text-emerald-600',
  red: 'bg-rose-50 text-rose-500',
  violet: 'bg-violet-50 text-violet-600',
  blue: 'bg-sky-50 text-sky-600',
  slate: 'bg-slate-100 text-slate-500',
}

export default function Scan() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('camera')
  const [manual, setManual] = useState('')
  const [fileBusy, setFileBusy] = useState(false)
  const [fileError, setFileError] = useState('')
  const [fileName, setFileName] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [history, setHistory] = useState(loadHistory)
  const [allHistoryOpen, setAllHistoryOpen] = useState(false)
  const fileRef = useRef(null)
  const manualRef = useRef(null)

  const lookup = useScanLookup()
  const returnAssignment = useReturnAssignment()
  const { data: categories } = useCategories()
  const { data: transactions } = useTransactions({})
  const { data: assignments } = useAssignments({})

  const catName = (id) => categories?.find((c) => c.id === id)?.name || '—'

  const runLookup = (code) => {
    const value = String(code || '').trim()
    if (!value) return
    lookup.mutate(value, {
      onSuccess: (data) => {
        const row = historyFromLookup(value, data, transactions)
        if (!row) return
        setHistory((prev) => {
          const next = [row, ...prev.filter((item) => item.code !== value)]
          saveHistory(next)
          return next
        })
      },
    })
  }

  useEffect(() => {
    if (tab === 'manual') manualRef.current?.focus()
  }, [tab])

  useHardwareScannerListener(tab !== 'manual', runLookup)

  const onFile = async (file) => {
    if (!file) return
    setFileError('')
    setFileName(file.name)
    setFileBusy(true)
    try {
      const code = await scanImageFile(file)
      runLookup(code)
    } catch {
      setFileError("Rasmda shtrix-kod yoki QR topilmadi. Aniqroq rasm yuklang.")
    } finally {
      setFileBusy(false)
    }
  }

  const recentRows = useMemo(() => {
    const fromTxns = (transactions || []).map((t) => ({
      id: t.id,
      code: t.product?.barcode,
      kind: 'product',
      title: t.product?.name || 'Mahsulot',
      barcode: t.product?.barcode || '—',
      photoUrl: t.product?.photoUrl,
      at: t.createdAt,
      badge: t.type === 'in' ? 'Kirim' : 'Chiqim',
      tone: t.type === 'in' ? 'green' : 'red',
    }))
    const fromAsg = (assignments || [])
      .filter((a) => a.status !== 'returned')
      .map((a) => ({
        id: a.id,
        code: a.qrToken || a.product?.barcode,
        kind: 'assignment',
        title: a.product?.name || 'Biriktirma',
        barcode: a.assetTag || a.product?.barcode || '—',
        photoUrl: a.product?.photoUrl,
        at: a.assignedAt,
        badge: 'Biriktirildi',
        tone: 'violet',
      }))
    const merged = []
    const seen = new Set()
    const add = (row) => {
      const key = (row.title || '').trim().toLowerCase()
      if (!key || seen.has(key)) return
      seen.add(key)
      merged.push(row)
    }
    history.forEach(add)
    ;[...fromTxns, ...fromAsg]
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .forEach(add)
    return merged
  }, [history, transactions, assignments])

  const visibleRecent = allHistoryOpen ? recentRows.slice(0, 12) : recentRows.slice(0, 5)

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title="Skanerlash"
        crumbs={['Asosiy', 'Skanerlash']}
        subtitle="Mahsulot QR kodini skanerlang — qaysi xona yoki xodimga biriktirilgani chiqadi."
        action={
          <button
            type="button"
            onClick={() => setTab('manual')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Keyboard size={16} /> Qo'lda kiritish
          </button>
        }
      />

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="card p-4 sm:p-5">
          <div className="grid grid-cols-4 gap-1 rounded-2xl bg-slate-100/80 p-1">
            {TABS.map((item) => {
              const Icon = item.icon
              const on = tab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-[12px] font-semibold transition sm:text-sm',
                    on ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-slate-800',
                  )}
                >
                  <Icon size={16} className={on ? 'text-brand-600' : 'text-slate-400'} />
                  <span className="hidden truncate lg:inline">{item.label}</span>
                  <span className="truncate lg:hidden">{TAB_SHORT[item.id]}</span>
                </button>
              )
            })}
          </div>

          <div className="mt-4">
            {tab === 'camera' && <BarcodeScanner framed active onDetected={runLookup} />}
            {tab === 'phone' && <PhonePairScan onDetected={runLookup} />}
            {tab === 'file' && (
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOver(false)
                  onFile(e.dataTransfer.files?.[0])
                }}
                className={cn(
                  'flex min-h-[280px] flex-col items-center justify-center rounded-[20px] border-2 border-dashed px-6 py-10 text-center transition sm:min-h-[340px]',
                  dragOver ? 'border-brand-400 bg-brand-50' : 'border-slate-200 bg-slate-50/70',
                )}
              >
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm">
                  {fileBusy ? <Loader2 size={22} className="animate-spin" /> : <ImageIcon size={22} />}
                </span>
                <p className="mt-3 text-sm font-semibold text-ink">Shtrix-kod yoki QR rasmini yuklang</p>
                <p className="mt-1 max-w-sm text-xs text-muted">PNG yoki JPG — shtrix-kod yoki QR aniq ko'rinadigan surat bo'lsin.</p>
                {fileName && <p className="mt-2 text-xs font-medium text-slate-500">{fileName}</p>}
                <SecondaryBtn className="mt-4" type="button" onClick={() => fileRef.current?.click()} disabled={fileBusy}>
                  {fileBusy ? 'O\'qilmoqda...' : 'Fayl tanlash'}
                </SecondaryBtn>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
                {fileError && <p className="mt-3 text-sm text-rose-600">{fileError}</p>}
              </div>
            )}
            {tab === 'manual' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (manual.trim()) runLookup(manual.trim())
                }}
                className="flex min-h-[280px] flex-col items-center justify-center rounded-[20px] bg-slate-50/70 px-6 py-10 sm:min-h-[340px]"
              >
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm">
                  <Barcode size={22} />
                </span>
                <p className="mt-3 text-sm font-semibold text-ink">Kodni qo'lda kiriting</p>
                <p className="mt-1 text-xs text-muted">Mahsulot shtrix-kodi, QR token yoki xodim badge kodi</p>
                <input
                  ref={manualRef}
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  placeholder="Masalan: 2872662494"
                  className={cn(inputClass, 'mt-4 max-w-md text-center font-mono tracking-wide')}
                />
                <PrimaryBtn type="submit" className="mt-3 min-w-[160px]" disabled={lookup.isPending || !manual.trim()}>
                  {lookup.isPending ? 'Qidirilmoqda...' : 'Qidirish'}
                </PrimaryBtn>
              </form>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <HintCard icon={Barcode} title="Barcha turdagi shtrix-kodlar" />
            <HintCard icon={QrCode} title="QR kodlar" hint="(qulay skanerlash)" />
            <HintCard icon={UserRound} title="Xodim badge kodlari" />
            <HintCard icon={ScanBarcode} title="USB/Bluetooth 2D skaner" hint="ulab, shu sahifada skanerlang" />
          </div>
        </div>

        <div className="space-y-4">
          <ResultPanel
            lookup={lookup}
            catName={catName}
            onReturn={(id) => returnAssignment.mutate(id)}
            returning={returnAssignment.isPending}
            onStockIn={(id) => navigate(`/stock-in?productId=${encodeURIComponent(id)}`)}
            onStockOut={(id) => navigate(`/stock-out?productId=${encodeURIComponent(id)}`)}
            onClear={() => lookup.reset()}
          />

          <div className="card p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-[15px] font-semibold text-ink">So'nggi skanerlar</h3>
              <button
                type="button"
                onClick={() => (recentRows.length > 5 ? setAllHistoryOpen((v) => !v) : navigate('/transactions'))}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                {allHistoryOpen ? "Yig'ish" : "Barchasini ko'rish"} →
              </button>
            </div>
            <ul className="divide-y divide-slate-100">
              {visibleRecent.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => row.code && runLookup(row.code)}
                    className="flex w-full items-center gap-3 py-2.5 text-left transition hover:bg-slate-50/80"
                  >
                    <Thumb url={row.photoUrl} kind={row.kind} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{row.title}</p>
                      <p className="truncate text-[11px] text-muted">
                        <span className="font-mono">{row.barcode}</span>
                        <span className="mx-1.5 text-slate-300">·</span>
                        {formatDate(row.at, true)}
                      </p>
                    </div>
                    <span className={cn('shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-semibold', BADGE_CLASS[row.tone] || BADGE_CLASS.slate)}>
                      {row.badge}
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-slate-300" />
                  </button>
                </li>
              ))}
              {!visibleRecent.length && <p className="py-8 text-center text-sm text-muted">Hozircha skanerlar yo'q</p>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function HintCard({ icon: Icon, title, hint }) {
  return (
    <div className="flex flex-col items-center px-1 py-3 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon size={20} />
      </span>
      <p className="mt-2 text-[11px] font-semibold leading-snug text-ink sm:text-[13px]">{title}</p>
      {hint ? <p className="mt-0.5 text-[10px] text-muted sm:text-xs">{hint}</p> : null}
    </div>
  )
}

function ResultPanel({ lookup, catName, onReturn, returning, onStockIn, onStockOut, onClear }) {
  if (lookup.isPending) {
    return (
      <div className="card flex min-h-[200px] items-center justify-center p-5">
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 size={16} className="animate-spin" /> Qidirilmoqda...
        </p>
      </div>
    )
  }

  if (lookup.isError) {
    const message = /failed to fetch/i.test(lookup.error?.message || '')
      ? "Serverga ulanib bo'lmadi. Qayta urinib ko'ring."
      : lookup.error.message
    return (
      <div className="card p-5">
        <p className="text-sm font-semibold text-rose-600">{message}</p>
        <p className="mt-1 text-xs text-muted">Kodni qayta skanerlang yoki qo'lda kiriting.</p>
        <SecondaryBtn className="mt-3 w-full" onClick={onClear}>
          <RotateCcw size={15} /> Qayta urinish
        </SecondaryBtn>
      </div>
    )
  }

  const data = lookup.data
  if (!data) {
    return (
      <div className="card p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-slate-50 text-slate-300">
            <Package size={26} />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Skanerlash kutilmoqda</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Kameraga kodni tuting, rasm yuklang yoki shtrix-kodni qo'lda kiriting — natija shu yerda chiqadi.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (data.kind === 'product') {
    const p = data.product
    return (
      <div className="overflow-hidden rounded-[20px] bg-emerald-50/80 p-4 shadow-[0_1px_2px_rgb(16_24_40_/_4%),0_8px_24px_rgb(16_24_40_/_4%)]">
        <div className="flex items-start gap-3">
          {p.photoUrl ? (
            <img src={p.photoUrl} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-1 ring-white" />
          ) : (
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white text-slate-400">
              <Package size={24} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-emerald-600">
              <CheckCircle2 size={16} /> Mahsulot topildi!
            </p>
            <Link to={`/products/${p.id}`} className="mt-0.5 block truncate text-[15px] font-bold text-ink hover:text-brand-700">
              {p.name}
            </Link>
            <dl className="mt-2 space-y-0.5 text-[12px] text-slate-500">
              <div className="flex gap-2">
                <dt className="w-[88px] shrink-0">Shtrix-kod:</dt>
                <dd className="font-mono font-medium text-ink">{p.barcode}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-[88px] shrink-0">Kategoriya:</dt>
                <dd className="font-medium text-ink">{catName(p.categoryId)}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-[88px] shrink-0">Omborda:</dt>
                <dd className="font-bold text-emerald-600">
                  {p.quantity} {p.unit}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-[88px] shrink-0">Narxi:</dt>
                <dd className="font-medium text-ink">{formatSum(p.price)}</dd>
              </div>
            </dl>
          </div>
        </div>
        {data.activeAssignments?.length > 0 && (
          <div className="mt-3 space-y-1">
            {data.activeAssignments.map((a) => (
              <Link
                key={a.id}
                to={`/assignments/${a.id}`}
                className="block rounded-xl bg-white/80 px-3 py-1.5 text-xs text-slate-600 hover:bg-white"
              >
                {a.room ? roomTitle(a.room) : a.employee?.fullName || '—'} — {a.quantity} {p.unit}
              </Link>
            ))}
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <PrimaryBtn className="!rounded-xl" onClick={() => onStockIn(p.id)}>
            <Plus size={16} /> Kirim qilish
          </PrimaryBtn>
          <button
            type="button"
            onClick={() => onStockOut(p.id)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            <ArrowUpRight size={16} /> Chiqim qilish
          </button>
        </div>
      </div>
    )
  }

  if (data.kind === 'employee') {
    const e = data.employee
    return (
      <div className="overflow-hidden rounded-[20px] bg-sky-50/80 p-4 shadow-[0_1px_2px_rgb(16_24_40_/_4%),0_8px_24px_rgb(16_24_40_/_4%)]">
        <div className="flex items-start gap-3">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white text-sky-600">
            <UserRound size={24} />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-sky-700">
              <CheckCircle2 size={16} /> Xodim topildi!
            </p>
            <Link to={`/employees/${e.id}`} className="mt-0.5 block truncate text-[15px] font-bold text-ink hover:text-brand-700">
              {e.fullName}
            </Link>
            <p className="mt-1 text-xs text-muted">
              {e.department} · {e.position}
            </p>
            <p className="mt-1 font-mono text-xs text-ink">{e.badgeCode}</p>
          </div>
        </div>
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-semibold text-muted">Undagi buyumlar ({data.activeAssignments?.length || 0})</p>
          {(data.activeAssignments || []).map((a) => (
            <Link
              key={a.id}
              to={`/assignments/${a.id}`}
              className="mt-1 block rounded-xl bg-white/80 px-3 py-1.5 text-xs text-slate-600 hover:bg-white"
            >
              {a.product?.name} — {a.quantity} {a.product?.unit}
            </Link>
          ))}
        </div>
      </div>
    )
  }

  if (data.kind === 'room') {
    const room = data.room
    return (
      <div className="overflow-hidden rounded-[20px] bg-brand-50/80 p-4 shadow-[0_1px_2px_rgb(16_24_40_/_4%),0_8px_24px_rgb(16_24_40_/_4%)]">
        <div className="flex items-start gap-3">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white text-brand-600">
            <DoorOpen size={24} />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-brand-700">
              <CheckCircle2 size={16} /> Xona topildi!
            </p>
            <p className="mt-0.5 text-[15px] font-bold text-ink">{roomTitle(room)}</p>
            <p className="mt-1 text-xs text-muted">
              {[room.building, room.floor ? `${room.floor}-qavat` : ''].filter(Boolean).join(' · ') || 'Xona'}
            </p>
          </div>
        </div>
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-semibold text-muted">Xonadagi buyumlar ({data.activeAssignments?.length || 0})</p>
          {(data.activeAssignments || []).map((a) => (
            <Link
              key={a.id}
              to={`/assignments/${a.id}`}
              className="mt-1 block rounded-xl bg-white/80 px-3 py-1.5 text-xs text-slate-600 hover:bg-white"
            >
              {a.product?.name} — {a.quantity} {a.product?.unit}
            </Link>
          ))}
          {!data.activeAssignments?.length && <p className="text-xs text-muted">Hozircha biriktirilgan buyum yo'q</p>}
        </div>
      </div>
    )
  }

  if (data.kind === 'assignment') {
    const { assignment, product, employee, room } = data
    return (
      <div className="overflow-hidden rounded-[20px] bg-violet-50/80 p-4 shadow-[0_1px_2px_rgb(16_24_40_/_4%),0_8px_24px_rgb(16_24_40_/_4%)]">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-violet-700">
          <CheckCircle2 size={16} /> Biriktirma topildi!
        </p>
        <Link to={`/assignments/${assignment.id}`} className="mt-1 block text-[15px] font-bold text-ink hover:text-brand-700">
          {product?.name}
        </Link>
        <p className="text-xs text-muted">
          {assignment.assetTag} · {assignment.quantity} {product?.unit}
        </p>
        <div className="mt-3 rounded-2xl bg-white/80 p-3">
          <p className="text-xs text-muted">{room ? 'Qaysi xonaga biriktirilgan' : 'Kimga biriktirilgan'}</p>
          {room ? (
            <>
              <p className="font-semibold">{roomTitle(room)}</p>
              <p className="text-xs text-muted">
                {[room.building, room.floor ? `${room.floor}-qavat` : ''].filter(Boolean).join(' · ')}
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold">{employee?.fullName}</p>
              <p className="text-xs text-muted">
                {employee?.department} · {employee?.position}
              </p>
            </>
          )}
        </div>
        <div className="mt-3">
          <Badge tone={assignment.status === 'active' ? 'green' : assignment.status === 'pending' ? 'yellow' : 'slate'}>
            {assignment.status === 'active' ? 'Foydalanishda' : assignment.status === 'pending' ? 'Tasdiq kutilmoqda' : 'Qaytarilgan'}
          </Badge>
        </div>
        <Link
          to={`/assignments/${assignment.id}`}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          Batafsil va QR kod
        </Link>
        {assignment.status !== 'returned' && (
          <PrimaryBtn className="mt-2 w-full" onClick={() => onReturn(assignment.id)} disabled={returning}>
            Omborga qaytarish
          </PrimaryBtn>
        )}
      </div>
    )
  }

  return null
}
