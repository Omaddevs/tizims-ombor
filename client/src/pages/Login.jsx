import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, ChevronRight, Eye, EyeOff, Lock, User } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useOrgsPublic } from '../api/queries'
import { ErrorNote } from '../components/ui'
import { IlluWelcome } from '../components/illustrations'

const DEMO = [
  { label: 'Ombor mudiri', identity: 'admin', password: 'Admin123!' },
  { label: 'Menejer', identity: 'menejer', password: 'Manager123!' },
  { label: 'Xodim', identity: 'omadbek', password: 'Employee123!' },
]

export default function Login() {
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const { data: orgs, isLoading } = useOrgsPublic()
  const [orgId, setOrgId] = useState(null)
  const [identity, setIdentity] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const org = orgs?.find((o) => o.id === orgId)

  const onSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const res = await login(orgId, identity, password)
    setSubmitting(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    navigate('/')
  }

  const fill = (d) => {
    setIdentity(d.identity)
    setPassword(d.password)
    setError('')
  }

  return (
    <div className="min-h-dvh bg-[#f4f6fb] lg:grid lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-center lg:px-16 xl:px-20">
        <div className="absolute -left-16 top-16 h-64 w-64 rounded-full bg-brand-100" />
        <div className="absolute bottom-10 right-10 h-40 w-40 rounded-full bg-emerald-100/70" />
        <div className="relative">
          <img src="/logo.svg" alt="" className="h-14 w-14 rounded-2xl" />
          <p className="mt-8 text-4xl font-extrabold tracking-tight text-ink xl:text-5xl">tizimsOmbor.uz</p>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-slate-500">
            Universitet ombori uchun professional boshqaruv platformasi — mahsulotlar, kirim-chiqim, xodimlarga biriktirish,
            shtrix-kod va QR nazorati, hisobotlar bir joyda.
          </p>
          <div className="mt-10 max-w-sm rounded-[24px] bg-white p-5 shadow-[0_12px_40px_rgba(16,24,40,0.06)]">
            <IlluWelcome />
            <p className="mt-2 text-center text-sm font-medium text-slate-500">Oq, sodda va tushunarli ish paneli</p>
          </div>
        </div>
      </div>

      <div className="mx-auto flex min-h-dvh w-full max-w-[460px] flex-col items-center justify-center px-5 py-10 lg:max-w-none lg:px-10 xl:px-16">
        <img src="/logo.svg" alt="" className="mb-5 h-14 w-14 rounded-2xl lg:hidden" />
        <div className="w-full rounded-[24px] bg-white px-5 py-8 shadow-[0_12px_40px_rgba(16,24,40,0.06)] lg:max-w-md lg:px-8 lg:py-9">
          {!orgId ? (
            <>
              <h1 className="text-center text-[24px] font-bold tracking-tight text-ink">Tashkilotni tanlang</h1>
              <p className="mt-1 text-center text-[13px] font-medium text-slate-400">Omborga kirish uchun tashkilotingizni tanlang</p>
              <div className="mt-6 space-y-2.5">
                {isLoading && <p className="py-6 text-center text-sm text-muted">Yuklanmoqda...</p>}
                {orgs?.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setOrgId(o.id)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3.5 text-left transition hover:bg-brand-50"
                  >
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white"
                      style={{ background: o.brandColor || '#3b6cf5' }}
                    >
                      <Building2 size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-ink">{o.name}</span>
                    </span>
                    <ChevronRight size={18} className="shrink-0 text-slate-300" />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <button onClick={() => setOrgId(null)} className="mb-3 text-[13px] font-semibold text-brand-600">
                ← Tashkilotni almashtirish
              </button>
              <h1 className="text-center text-[24px] font-bold tracking-tight text-ink">{org?.name}</h1>
              <p className="mt-1 text-center text-[13px] font-medium text-slate-400">Login va parolingizni kiriting</p>

              <form onSubmit={onSubmit} className="mt-6 space-y-3.5">
                <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3.5">
                  <User size={18} className="shrink-0 text-slate-400" strokeWidth={2.2} />
                  <input
                    className="w-full bg-transparent text-[16px] text-ink outline-none placeholder:text-slate-400"
                    value={identity}
                    onChange={(e) => setIdentity(e.target.value)}
                    autoComplete="username"
                    required
                    placeholder="Login yoki email"
                    aria-label="Login"
                  />
                </label>
                <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3.5">
                  <Lock size={18} className="shrink-0 text-slate-400" strokeWidth={2.2} />
                  <input
                    className="w-full bg-transparent text-[16px] text-ink outline-none placeholder:text-slate-400"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder="Parol"
                    aria-label="Parol"
                  />
                  <button type="button" onClick={() => setShowPass((v) => !v)} className="shrink-0 text-slate-400">
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </label>

                <ErrorNote>{error}</ErrorNote>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-brand-600 py-3.5 text-[16px] font-semibold text-white shadow-[0_8px_20px_rgba(59,108,245,0.28)] disabled:opacity-60"
                >
                  {submitting ? 'Tekshirilmoqda...' : 'Kirish'}
                </button>
              </form>

              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <span className="w-full text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">Demo hisoblar</span>
                {DEMO.map((d) => (
                  <button
                    key={d.identity}
                    type="button"
                    onClick={() => fill(d)}
                    className="rounded-full bg-slate-50 px-3 py-1.5 text-[12px] font-semibold text-brand-700 hover:bg-brand-50"
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
