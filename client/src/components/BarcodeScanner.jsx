import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Zap } from 'lucide-react'
import { cn } from './ui'

const FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
]

let scannerIdSeq = 0

function qrboxSize(viewfinderWidth, viewfinderHeight) {
  const width = Math.max(140, Math.min(Math.floor(viewfinderWidth * 0.62), viewfinderWidth - 48))
  const height = Math.max(90, Math.min(Math.floor(viewfinderHeight * 0.36), viewfinderHeight - 48))
  return { width, height }
}

export async function scanImageFile(file) {
  const id = `file-scan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const host = document.createElement('div')
  host.id = id
  host.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden'
  document.body.appendChild(host)
  const instance = new Html5Qrcode(id, { formatsToSupport: FORMATS, verbose: false, useBarCodeDetectorIfSupported: true })
  try {
    return await instance.scanFile(file, false)
  } finally {
    try {
      instance.clear()
    } catch {
      /* ignore */
    }
    host.remove()
  }
}

export function BarcodeScanner({ onDetected, active = true, framed = false }) {
  const elementIdRef = useRef(`scanner-${++scannerIdSeq}`)
  const instanceRef = useRef(null)
  const onDetectedRef = useRef(onDetected)
  const lastRef = useRef({ code: '', at: 0 })
  const [error, setError] = useState('')
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)

  onDetectedRef.current = onDetected

  useEffect(() => {
    if (!active) return undefined
    let cancelled = false
    const instance = new Html5Qrcode(elementIdRef.current, {
      formatsToSupport: FORMATS,
      useBarCodeDetectorIfSupported: true,
      verbose: false,
    })
    instanceRef.current = instance
    let started = false

    instance
      .start(
        { facingMode: 'environment' },
        { fps: 12, qrbox: framed ? qrboxSize : { width: 250, height: 250 } },
        (decodedText) => {
          if (cancelled || !decodedText) return
          const now = Date.now()
          if (decodedText === lastRef.current.code && now - lastRef.current.at < 2200) return
          lastRef.current = { code: decodedText, at: now }
          onDetectedRef.current?.(decodedText)
        },
        () => {},
      )
      .then(() => {
        started = true
        if (cancelled) {
          instance
            .stop()
            .then(() => instance.clear())
            .catch(() => {})
          return
        }
        try {
          const torch = instance.getRunningTrackCameraCapabilities?.().torchFeature?.()
          if (torch?.isSupported?.()) setTorchSupported(true)
        } catch {
          setTorchSupported(false)
        }
      })
      .catch(() => {
        if (!cancelled) setError("Kamerani ochib bo'lmadi. Brauzer sozlamalarida kameraga ruxsat berilganini tekshiring.")
      })

    return () => {
      cancelled = true
      setTorchOn(false)
      setTorchSupported(false)
      if (started) {
        try {
          instance
            .stop()
            .then(() => instance.clear())
            .catch(() => {})
        } catch {
          /* scanner was never actually running */
        }
      }
    }
  }, [active, framed])

  const toggleTorch = async () => {
    const instance = instanceRef.current
    if (!instance || !torchSupported) return
    const next = !torchOn
    try {
      await instance.getRunningTrackCameraCapabilities().torchFeature().apply(next)
      setTorchOn(next)
    } catch {
      try {
        await instance.applyVideoConstraints({ advanced: [{ torch: next }] })
        setTorchOn(next)
      } catch {
        /* desktop cameras often have no torch */
      }
    }
  }

  return (
    <div className={cn('relative w-full max-w-full overflow-hidden bg-black', framed ? 'aspect-[16/10] min-h-[280px] rounded-[20px] sm:min-h-[340px]' : 'rounded-3xl')}>
      <div
        id={elementIdRef.current}
        className="absolute inset-0 h-full w-full overflow-hidden [&_#qr-shaded-region]:hidden [&_img]:hidden [&_video]:!h-full [&_video]:!w-full [&_video]:max-w-full [&_video]:object-cover"
      />
      {framed && !error && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/45" />
          <div className="absolute left-[19%] right-[19%] top-[32%] bottom-[32%]">
            <span className="absolute left-0 top-0 h-9 w-9 rounded-tl-md border-l-[3px] border-t-[3px] border-sky-400" />
            <span className="absolute right-0 top-0 h-9 w-9 rounded-tr-md border-r-[3px] border-t-[3px] border-sky-400" />
            <span className="absolute bottom-0 left-0 h-9 w-9 rounded-bl-md border-b-[3px] border-l-[3px] border-sky-400" />
            <span className="absolute bottom-0 right-0 h-9 w-9 rounded-br-md border-b-[3px] border-r-[3px] border-sky-400" />
            <div className="scan-sweep absolute inset-x-3 h-0.5 rounded-full bg-gradient-to-r from-transparent via-sky-300 to-transparent" />
          </div>
          <button
            type="button"
            onClick={toggleTorch}
            className={cn(
              'pointer-events-auto absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md transition',
              torchOn ? 'bg-amber-400/90 text-slate-900' : 'bg-black/45 hover:bg-black/60',
              !torchSupported && 'opacity-70',
            )}
          >
            <Zap size={13} fill={torchOn ? 'currentColor' : 'none'} />
            Chiroq
          </button>
          <div className="absolute inset-x-0 bottom-4 flex justify-center px-4">
            <div className="rounded-2xl bg-black/70 px-4 py-2 text-center shadow-lg backdrop-blur-sm">
              <p className="text-[13px] font-semibold text-white">Shtrix-kodni ramka ichiga joylashtiring</p>
              <p className="text-[11px] text-white/70">Skanerlash avtomatik amalga oshiriladi</p>
            </div>
          </div>
        </div>
      )}
      {error && <p className="absolute inset-x-0 bottom-0 bg-rose-600 px-4 py-3 text-center text-sm text-white">{error}</p>}
    </div>
  )
}
