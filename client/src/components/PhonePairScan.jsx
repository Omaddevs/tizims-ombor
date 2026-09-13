import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { CheckCircle2, Loader2, RefreshCw, Smartphone } from 'lucide-react'
import { SecondaryBtn } from './ui'
import { useCreateScanPairSession, useEndScanPairSession } from '../api/queries'

function fmtClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function PhonePairScan({ onDetected }) {
  const [session, setSession] = useState(null)
  const [qrUrl, setQrUrl] = useState('')
  const [connected, setConnected] = useState(false)
  const [gotCode, setGotCode] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [error, setError] = useState('')

  const sessionRef = useRef(null)
  const onDetectedRef = useRef(onDetected)
  onDetectedRef.current = onDetected

  const create = useCreateScanPairSession()
  const end = useEndScanPairSession()

  const start = () => {
    setError('')
    setConnected(false)
    setGotCode(false)
    create.mutate(undefined, {
      onSuccess: (data) => setSession(data),
      onError: () => setError("Sessiya yaratib bo'lmadi. Qayta urinib ko'ring."),
    })
  }

  useEffect(() => {
    start()
    return () => {
      if (sessionRef.current?.id) end.mutate(sessionRef.current.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    if (!session?.id) return undefined
    const pairUrl = `${window.location.origin}/scan/pair/${session.id}`
    let cancelled = false
    QRCode.toDataURL(pairUrl, { width: 220, margin: 1, color: { dark: '#101828' } }).then((url) => {
      if (!cancelled) setQrUrl(url)
    })

    const es = new EventSource(`/api/scan-pair/${session.id}/stream`)
    es.addEventListener('connected', () => setConnected(true))
    es.addEventListener('code', (e) => {
      try {
        const { code } = JSON.parse(e.data)
        setGotCode(true)
        onDetectedRef.current?.(code)
      } catch {
        /* ignore malformed event */
      }
    })
    es.addEventListener('expired', () => start())
    es.addEventListener('closed', () => {})

    return () => {
      cancelled = true
      es.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id])

  useEffect(() => {
    if (!session?.expiresAt) return undefined
    const tick = () => setSecondsLeft(Math.max(0, Math.round((session.expiresAt - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [session?.expiresAt])

  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[20px] bg-slate-50/70 px-6 py-10 sm:min-h-[340px]">
      {create.isPending || !session ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 size={16} className="animate-spin" /> QR kod tayyorlanmoqda...
        </p>
      ) : (
        <>
          <div className="relative rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
            {qrUrl && <img src={qrUrl} alt="QR" className="h-[200px] w-[200px]" />}
            {connected && (
              <span className="absolute -right-2 -top-2 grid h-8 w-8 place-items-center rounded-full bg-emerald-500 text-white shadow-md">
                <CheckCircle2 size={18} />
              </span>
            )}
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Smartphone size={16} className="text-brand-600" />
            {connected ? 'Telefon ulandi' : 'Telefon kamerasi bilan QR ni skanerlang'}
          </p>
          <p className="mt-1 max-w-xs text-center text-xs text-muted">
            {!connected
              ? "Telefon kamerasini shu QR kodga tuting — brauzerda skanerlash sahifasi ochiladi."
              : gotCode
                ? 'Telefondan kod keldi — natija yon panelda chiqadi.'
                : 'Telefon ulandi, endi mahsulot yoki xodim kodini skanerlang.'}
          </p>
          <p className="mt-2 text-[11px] text-slate-400">
            {secondsLeft > 0 ? `QR ${fmtClock(secondsLeft)} ichida amal qiladi` : ''}
          </p>
          <SecondaryBtn className="mt-4" type="button" onClick={() => { if (session?.id) end.mutate(session.id); start() }}>
            <RefreshCw size={15} /> Yangi QR yaratish
          </SecondaryBtn>
          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        </>
      )}
    </div>
  )
}
