import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'
import { Loader2, Printer, RefreshCw } from 'lucide-react'
import { ErrorNote, PrimaryBtn, SecondaryBtn } from './ui'
import { Select } from './Select'
import { formatDate } from '../lib/format'
import { roomTitle } from '../lib/assignment'
import { usePrinters, usePrintLabel } from '../api/queries'

const BROWSER_PRINTER = '__browser__'
const LS_KEY = 'tizims.lastPrinter'

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text || '').split(' ')
  let line = ''
  let cy = y
  const lines = []
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  const start = cy - ((lines.length - 1) * lineHeight) / 2
  lines.forEach((item, i) => ctx.fillText(item, x, start + i * lineHeight))
  return lines.length
}

export async function buildAssignmentLabelImage({ assignment, product, employee, room }) {
  const qr = await QRCode.toDataURL(assignment.qrToken, {
    width: 360,
    margin: 1,
    color: { dark: '#101828' },
    errorCorrectionLevel: 'M',
  })
  const canvas = document.createElement('canvas')
  const w = 640
  const h = 920
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = '#cbd5e1'
  ctx.setLineDash([10, 8])
  ctx.lineWidth = 3
  ctx.strokeRect(24, 24, w - 48, h - 48)
  ctx.setLineDash([])

  ctx.fillStyle = '#1d4ed8'
  ctx.font = 'bold 22px Segoe UI, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('tizimsOmbor.uz', w / 2, 64)

  const img = await loadImage(qr)
  const qrSize = 360
  ctx.drawImage(img, (w - qrSize) / 2, 88, qrSize, qrSize)

  ctx.fillStyle = '#101828'
  ctx.font = 'bold 28px Segoe UI, sans-serif'
  wrapText(ctx, product?.name || 'Mahsulot', w / 2, 490, w - 96, 34)

  ctx.fillStyle = '#64748b'
  ctx.font = '20px Segoe UI, sans-serif'
  ctx.fillText(assignment.assetTag || '', w / 2, 560)

  ctx.beginPath()
  ctx.setLineDash([6, 6])
  ctx.moveTo(56, 590)
  ctx.lineTo(w - 56, 590)
  ctx.strokeStyle = '#cbd5e1'
  ctx.stroke()
  ctx.setLineDash([])

  ctx.textAlign = 'left'
  ctx.fillStyle = '#334155'
  ctx.font = '20px Segoe UI, sans-serif'
  const lines = room
    ? [`Xona: ${roomTitle(room)}`, `Raqam: ${room.number}`, `Sana: ${formatDate(assignment.assignedAt)}`]
    : [
        `Xodim: ${employee?.fullName || '—'}`,
        `Bo'lim: ${employee?.department || '—'}`,
        `Sana: ${formatDate(assignment.assignedAt)}`,
      ]
  lines.forEach((line, i) => ctx.fillText(line, 64, 640 + i * 40))
  return canvas.toDataURL('image/png')
}

export function PrintControls({ getImage, className }) {
  const { data, isFetching, refetch, isError, error } = usePrinters()
  const print = usePrintLabel()
  const [printer, setPrinter] = useState(() => {
    try {
      return localStorage.getItem(LS_KEY) || BROWSER_PRINTER
    } catch {
      return BROWSER_PRINTER
    }
  })
  const [message, setMessage] = useState('')
  const [fail, setFail] = useState('')

  const printers = data?.printers || []
  const options = useMemo(
    () => [
      { value: BROWSER_PRINTER, label: 'Brauzer chop etish oynasi' },
      ...printers.map((p) => ({
        value: p.name,
        label: `${p.name}${p.isDefault ? ' (asosiy)' : ''}${p.offline ? ' · offline' : p.status && p.status !== 'Tayyor' ? ` · ${p.status}` : ''}`,
      })),
    ],
    [printers],
  )

  useEffect(() => {
    if (printer !== BROWSER_PRINTER && !printers.some((p) => p.name === printer)) {
      const def = printers.find((p) => p.isDefault)
      if (def) setPrinter(def.name)
    }
  }, [printers, printer])

  const submit = async () => {
    setFail('')
    setMessage('')
    if (printer === BROWSER_PRINTER) {
      window.print()
      return
    }
    try {
      const image = await getImage()
      await print.mutateAsync({ printer, image })
      try {
        localStorage.setItem(LS_KEY, printer)
      } catch {
        /* ignore */
      }
      setMessage('Yorliq tanlangan printerga yuborildi')
    } catch (e) {
      setFail(e.message || 'Printerga yuborib bo\'lmadi')
    }
  }

  return (
    <div className={className || 'no-print mt-4 space-y-3'}>
      <div>
        <span className="mb-1.5 block text-sm font-medium text-slate-600">Printer</span>
        <div className="flex items-center gap-2">
          <Select value={printer} onChange={setPrinter} options={options} className="min-w-0 flex-1" />
          <SecondaryBtn
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="shrink-0 px-3"
            title="Printerlarni yangilash"
            aria-label="Printerlarni yangilash"
          >
            {isFetching ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </SecondaryBtn>
        </div>
      </div>
      {data?.error ? <p className="text-xs text-amber-600">{data.error}</p> : null}
      {isError ? <ErrorNote>{error?.message}</ErrorNote> : null}
      <ErrorNote>{fail}</ErrorNote>
      {message ? <p className="text-sm font-medium text-emerald-600">{message}</p> : null}
      <PrimaryBtn type="button" className="w-full" onClick={submit} disabled={print.isPending}>
        <Printer size={16} /> {print.isPending ? 'Yuborilmoqda...' : 'Chop etish'}
      </PrimaryBtn>
      <p className="text-center text-[11px] text-muted">
        Kompyuterga ulangan printerni tanlang yoki brauzer oynasi orqali chop eting.
      </p>
    </div>
  )
}

export function AssignmentQrLabel({ assignment, product, employee, room }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (canvasRef.current && assignment?.qrToken) {
      QRCode.toCanvas(canvasRef.current, assignment.qrToken, { width: 168, margin: 1, color: { dark: '#101828' } })
    }
  }, [assignment?.qrToken])

  return (
    <div>
      <div id="print-area" className="mx-auto w-[300px] rounded-2xl border-2 border-dashed border-slate-300 p-4 text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-700">tizimsOmbor.uz</p>
        <canvas ref={canvasRef} className="mx-auto my-3" />
        <p className="text-sm font-bold leading-tight">{product?.name}</p>
        <p className="mt-1 text-xs text-slate-500">{assignment?.assetTag}</p>
        <div className="mt-3 space-y-0.5 border-t border-dashed border-slate-300 pt-3 text-left text-xs text-slate-600">
          {room ? (
            <>
              <p>
                <b>Xona:</b> {roomTitle(room)}
              </p>
              <p>
                <b>Raqam:</b> {room.number}
              </p>
            </>
          ) : (
            <>
              <p>
                <b>Xodim:</b> {employee?.fullName}
              </p>
              <p>
                <b>Bo'lim:</b> {employee?.department}
              </p>
            </>
          )}
          <p>
            <b>Sana:</b> {formatDate(assignment?.assignedAt)}
          </p>
        </div>
      </div>
      <PrintControls getImage={() => buildAssignmentLabelImage({ assignment, product, employee, room })} />
    </div>
  )
}

export function EmployeeBadgeLabel({ employee }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (svgRef.current && employee?.badgeCode) {
      JsBarcode(svgRef.current, employee.badgeCode, { format: 'CODE128', height: 46, width: 1.6, fontSize: 12, margin: 6 })
    }
  }, [employee?.badgeCode])

  return (
    <div>
      <div id="print-area" className="mx-auto w-[300px] rounded-2xl border-2 border-dashed border-slate-300 p-4 text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-700">tizimsOmbor.uz</p>
        <p className="mt-2 text-sm font-bold leading-tight">{employee?.fullName}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {employee?.department}
          {employee?.position ? ` · ${employee.position}` : ''}
        </p>
        <svg ref={svgRef} className="mx-auto mt-2 max-w-full" />
      </div>
      <PrimaryBtn className="no-print mx-auto mt-4" onClick={() => window.print()}>
        <Printer size={16} /> Chop etish
      </PrimaryBtn>
    </div>
  )
}

export function ProductBarcodeLabel({ product }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (svgRef.current && product?.barcode) {
      JsBarcode(svgRef.current, product.barcode, { format: 'CODE128', height: 46, width: 1.6, fontSize: 12, margin: 6 })
    }
  }, [product?.barcode])

  return (
    <div>
      <div id="print-area" className="mx-auto w-[300px] rounded-2xl border-2 border-dashed border-slate-300 p-4 text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-700">tizimsOmbor.uz</p>
        <p className="mt-2 text-sm font-bold leading-tight">{product?.name}</p>
        <svg ref={svgRef} className="mx-auto mt-2 max-w-full" />
      </div>
      <PrimaryBtn className="no-print mx-auto mt-4" onClick={() => window.print()}>
        <Printer size={16} /> Chop etish
      </PrimaryBtn>
    </div>
  )
}
