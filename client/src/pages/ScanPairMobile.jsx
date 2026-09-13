import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, Loader2, QrCode, ShieldCheck } from 'lucide-react'
import { BarcodeScanner } from '../components/BarcodeScanner'
import { api, ApiError } from '../api/client'
import { PrimaryBtn } from '../components/ui'

export default function ScanPairMobile() {
  const { id } = useParams()
  const [state, setState] = useState('loading') // loading | invalid | confirm | scanning
  const [orgName, setOrgName] = useState('')
  const [sent, setSent] = useState([])
  const [sendError, setSendError] = useState('')

  useEffect(() => {
    let cancelled = false
    api
      .get(`/scan-pair/${id}`)
      .then((data) => {
        if (cancelled) return
        setOrgName(data.orgName || '')
        setState('confirm')
      })
      .catch(() => {
        if (!cancelled) setState('invalid')
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const onDetected = async (code) => {
    setSendError('')
    try {
      await api.post(`/scan-pair/${id}/code`, { code })
      setSent((prev) => [{ code, at: Date.now() }, ...prev].slice(0, 8))
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setState('invalid')
        return
      }
      setSendError("Yuborib bo'lmadi, internetni tekshirib qayta urinib ko'ring.")
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#0b0f1a]">
      <header className="flex items-center gap-2 px-5 py-4 text-white">
        <img src="/logo.svg" alt="" className="h-8 w-8 rounded-lg" />
        <span className="text-sm font-bold tracking-tight">tizimsOmbor.uz</span>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-5 pb-10 text-center">
        {state === 'loading' && (
          <p className="flex items-center gap-2 text-sm text-white/60">
            <Loader2 size={16} className="animate-spin" /> Yuklanmoqda...
          </p>
        )}

        {state === 'invalid' && (
          <div className="max-w-xs text-white/80">
            <QrCode size={36} className="mx-auto text-white/30" />
            <p className="mt-3 text-sm font-semibold">QR kod muddati tugagan</p>
            <p className="mt-1 text-xs text-white/50">
              Kompyuterda Skanerlash sahifasida "Telefondan skanerlash" bo'limida yangi QR kod yarating va qayta skanerlang.
            </p>
          </div>
        )}

        {state === 'confirm' && (
          <div className="max-w-xs text-white">
            <ShieldCheck size={36} className="mx-auto text-brand-400" />
            <p className="mt-3 text-base font-bold">{orgName || 'Ombor'} tizimiga ulanish</p>
            <p className="mt-1 text-xs leading-5 text-white/60">
              Ushbu telefon kamerasi ombor kompyuteridagi skanerlash sessiyasiga ulanadi. Skanerlangan kodlar faqat shu
              sessiyaga, boshqa hech kimga yuborilmaydi.
            </p>
            <PrimaryBtn className="mt-5 w-full justify-center" onClick={() => setState('scanning')}>
              Kamerani yoqish
            </PrimaryBtn>
          </div>
        )}

        {state === 'scanning' && (
          <div className="w-full max-w-sm">
            <BarcodeScanner framed active onDetected={onDetected} />
            <p className="mt-3 text-xs text-white/50">Skanerlangan kod avtomatik kompyuterga yuboriladi.</p>
            {sendError && <p className="mt-2 text-xs text-rose-400">{sendError}</p>}
            {sent.length > 0 && (
              <ul className="mt-4 space-y-1.5 text-left">
                {sent.map((row) => (
                  <li key={row.at} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs text-white/80">
                    <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                    <span className="truncate font-mono">{row.code}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
