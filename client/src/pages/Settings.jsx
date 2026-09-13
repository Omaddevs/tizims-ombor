import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Boxes,
  Building2,
  Check,
  ClipboardList,
  DatabaseBackup,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Languages,
  Loader2,
  LogOut,
  Mail,
  PackageMinus,
  PackagePlus,
  Pencil,
  Phone,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  User,
  X,
} from 'lucide-react'
import { useAuthStore, useCurrentUser } from '../store/useAuthStore'
import { useChangePassword, useMeStats, useUpdateProfile } from '../api/queries'
import { Avatar, Badge, DangerBtn, EmptyState, ErrorNote, Field, PageHeader, PrimaryBtn, SecondaryBtn, cn, inputClass } from '../components/ui'
import { ROLE_LABEL, formatDate } from '../lib/format'

const TABS = [
  { id: 'profile', label: 'Profil ma\'lumotlari', hint: 'Shaxsiy ma\'lumotlaringiz', icon: User, roles: ['super_admin', 'admin', 'manager', 'employee'] },
  { id: 'security', label: 'Xavfsizlik', hint: 'Parol va tizim xavfsizligi', icon: ShieldCheck, roles: ['super_admin', 'admin', 'manager', 'employee'] },
  { id: 'notifications', label: 'Bildirishnomalar', hint: 'Email va push sozlamalari', icon: Bell, roles: ['super_admin', 'admin', 'manager', 'employee'] },
  { id: 'system', label: 'Tizim sozlamalari', hint: 'Umumiy tizim parametrlari', icon: SlidersHorizontal, roles: ['super_admin', 'admin'] },
  { id: 'org', label: 'Tashkilot ma\'lumotlari', hint: 'Kompaniya va aloqa ma\'lumotlari', icon: Building2, roles: ['admin', 'manager', 'employee'] },
  { id: 'appearance', label: 'Til va ko\'rinish', hint: 'Til, tema va interfeys sozlamalari', icon: Languages, roles: ['super_admin', 'admin', 'manager', 'employee'] },
  { id: 'backup', label: 'Zaxira nusxa', hint: 'Ma\'lumotlar zaxira nusxasi', icon: DatabaseBackup, roles: ['super_admin', 'admin'] },
]

export default function Settings() {
  const me = useCurrentUser()
  const org = useAuthStore((s) => s.org)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const tabs = TABS.filter((t) => t.roles.includes(me?.role))
  const [tab, setTab] = useState('profile')

  const doLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-6">
      <PageHeader title="Sozlamalar" crumbs={['Asosiy', 'Sozlamalar']} subtitle="Tizim sozlamalarini boshqaring va profilingizni yangilang." />

      <div className="grid min-w-0 gap-5 lg:grid-cols-[260px_1fr]">
        <aside className="min-w-0 space-y-1 lg:sticky lg:top-[74px] lg:self-start">
          <nav className="card flex min-w-0 gap-1 overflow-x-auto p-1.5 lg:block lg:space-y-0.5 lg:overflow-visible lg:p-2">
            {tabs.map((t) => {
              const Icon = t.icon
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-left transition lg:w-full',
                    active ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700',
                  )}
                >
                  <Icon size={17} className="shrink-0" />
                  <span className="hidden lg:block">
                    <span className="block text-[13.5px] font-semibold leading-tight">{t.label}</span>
                    <span className={cn('block text-[11.5px] leading-tight', active ? 'text-brand-500' : 'text-slate-400')}>{t.hint}</span>
                  </span>
                  <span className="lg:hidden text-[13px] font-semibold">{t.label}</span>
                </button>
              )
            })}
          </nav>

          <DangerBtn onClick={doLogout} className="hidden w-full lg:flex">
            <LogOut size={16} /> Tizimdan chiqish
          </DangerBtn>
        </aside>

        <div className="min-w-0 space-y-5">
          {tab === 'profile' && <ProfileTab me={me} org={org} />}
          {tab === 'security' && <SecurityTab />}
          {tab === 'notifications' && <NotificationsTab me={me} />}
          {tab === 'system' && <SystemTab />}
          {tab === 'org' && <OrgTab org={org} />}
          {tab === 'appearance' && <AppearanceTab />}
          {tab === 'backup' && <BackupTab />}

          <DangerBtn onClick={doLogout} className="w-full lg:hidden">
            <LogOut size={16} /> Tizimdan chiqish
          </DangerBtn>
        </div>
      </div>
    </div>
  )
}

function SectionCard({ title, hint, children, action }) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
          {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function SuccessNote({ children }) {
  if (!children) return null
  return (
    <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
      <Check size={15} className="shrink-0" />
      {children}
    </p>
  )
}

const disabledInputClass = cn(inputClass, 'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400')

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className="truncate font-semibold">{value}</span>
    </div>
  )
}

// ---------- Profil ma'lumotlari ----------
function ProfileTab({ me, org }) {
  const setUser = useAuthStore((s) => s.setUser)
  const updateProfile = useUpdateProfile()
  const { data: stats } = useMeStats()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: me?.name || '', email: me?.email || '', phone: me?.phone || '' })
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!editing) setForm({ name: me?.name || '', email: me?.email || '', phone: me?.phone || '' })
  }, [me, editing])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    setError('')
    updateProfile.mutate(form, {
      onSuccess: (user) => {
        setUser(user)
        setEditing(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      },
      onError: (err) => setError(err.message),
    })
  }

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={me?.name} color={me?.avatarColor} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold leading-tight">{me?.name}</p>
                <Badge tone="brand">{ROLE_LABEL[me?.role]}</Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
                {org?.name && (
                  <span className="flex items-center gap-1.5">
                    <Building2 size={13} /> {org.name}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Mail size={13} /> {me?.email}
                </span>
                {me?.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone size={13} /> {me.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
          {!editing && (
            <SecondaryBtn onClick={() => setEditing(true)}>
              <Pencil size={15} /> Profilni tahrirlash
            </SecondaryBtn>
          )}
        </div>
      </div>

      {saved && <SuccessNote>Profil muvaffaqiyatli yangilandi</SuccessNote>}

      {editing ? (
        <form onSubmit={submit} className="card space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-ink">Asosiy ma'lumotlar</h3>
            <Badge tone="green">Faol</Badge>
          </div>
          <ErrorNote>{error}</ErrorNote>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="To'liq ism" required>
              <input className={inputClass} value={form.name} onChange={set('name')} required />
            </Field>
            <Field label="Login" hint="Login o'zgartirilmaydi">
              <input className={disabledInputClass} value={me?.username || ''} disabled />
            </Field>
            <Field label="Email manzil" required>
              <input type="email" className={inputClass} value={form.email} onChange={set('email')} required />
            </Field>
            <Field label="Telefon raqam">
              <input className={inputClass} value={form.phone} onChange={set('phone')} placeholder="+998 90 000 00 00" />
            </Field>
            <Field label="Rol" hint="Rolni administrator belgilaydi">
              <input className={disabledInputClass} value={ROLE_LABEL[me?.role] || ''} disabled />
            </Field>
            <Field label="Tashkilot" hint="Tashkilot o'zgartirilmaydi">
              <input className={disabledInputClass} value={org?.name || '—'} disabled />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <SecondaryBtn type="button" onClick={() => { setEditing(false); setError('') }}>
              <X size={15} /> Bekor qilish
            </SecondaryBtn>
            <PrimaryBtn type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Saqlash
            </PrimaryBtn>
          </div>
        </form>
      ) : (
        <div className="card divide-y divide-slate-100">
          <Row label="Login" value={me?.username} />
          <Row label="Email" value={me?.email} />
          <Row label="Telefon" value={me?.phone || '—'} />
          {org && <Row label="Tashkilot" value={org.name} />}
        </div>
      )}

      <SectionCard title="Hisob statistikalari" hint="Tizimdagi faoliyatingiz statistikasi">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile icon={Boxes} tone="brand" label="Jami operatsiya" value={stats?.total} />
          <StatTile icon={PackagePlus} tone="green" label="Kirimlar" value={stats?.in} />
          <StatTile icon={PackageMinus} tone="red" label="Chiqimlar" value={stats?.out} />
          <StatTile icon={ClipboardList} tone="violet" label="Biriktirmalar" value={stats?.assignments} />
        </div>
      </SectionCard>

      <SectionCard title="Hisob holati" hint="Hisobingiz haqida umumiy ma'lumot">
        <div className="divide-y divide-slate-100 -mx-5 -mb-5">
          <Row label="Holati" value={<Badge tone={me?.blocked ? 'red' : 'green'}>{me?.blocked ? 'Bloklangan' : 'Faol'}</Badge>} />
          <Row label="Ro'yxatdan o'tgan sana" value={formatDate(me?.createdAt)} />
        </div>
      </SectionCard>
    </div>
  )
}

function StatTile({ icon: Icon, tone, label, value }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-rose-50 text-rose-500',
    violet: 'bg-violet-50 text-violet-600',
  }
  return (
    <div className="rounded-2xl bg-slate-50 p-4 text-center">
      <div className={cn('mx-auto grid h-10 w-10 place-items-center rounded-xl', tones[tone])}>
        <Icon size={18} />
      </div>
      <p className="mt-2.5 text-2xl font-bold text-ink">{value ?? '—'}</p>
      <p className="mt-0.5 text-xs font-medium text-muted">{label}</p>
    </div>
  )
}

// ---------- Xavfsizlik ----------
function SecurityTab() {
  const changePassword = useChangePassword()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    setError('')
    setSaved(false)
    if (form.newPassword !== form.confirm) return setError("Yangi parollar bir xil emas")
    if (form.newPassword.length < 6) return setError("Yangi parol kamida 6 belgidan iborat bo'lishi kerak")
    changePassword.mutate(
      { currentPassword: form.currentPassword, newPassword: form.newPassword },
      {
        onSuccess: () => {
          setForm({ currentPassword: '', newPassword: '', confirm: '' })
          setSaved(true)
          setTimeout(() => setSaved(false), 3000)
        },
        onError: (err) => setError(err.message),
      },
    )
  }

  return (
    <div className="space-y-5">
      <SectionCard title="Parolni almashtirish" hint="Hisobingiz xavfsizligi uchun murakkab parol tanlang">
        <form onSubmit={submit} className="space-y-3.5">
          {saved && <SuccessNote>Parol muvaffaqiyatli yangilandi</SuccessNote>}
          <ErrorNote>{error}</ErrorNote>
          <Field label="Joriy parol" required>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                className={cn(inputClass, 'pr-10')}
                value={form.currentPassword}
                onChange={set('currentPassword')}
                required
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute inset-y-0 right-3 grid place-items-center text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Yangi parol" required hint="Kamida 6 belgi">
              <input
                type={show ? 'text' : 'password'}
                className={inputClass}
                value={form.newPassword}
                onChange={set('newPassword')}
                required
              />
            </Field>
            <Field label="Yangi parolni tasdiqlash" required>
              <input
                type={show ? 'text' : 'password'}
                className={inputClass}
                value={form.confirm}
                onChange={set('confirm')}
                required
              />
            </Field>
          </div>
          <div className="flex justify-end pt-1">
            <PrimaryBtn type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />} Parolni yangilash
            </PrimaryBtn>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Ikki bosqichli autentifikatsiya" hint="Hisobingizga qo'shimcha himoya qatlami qo'shing">
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-400">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">SMS yoki autentifikator orqali tasdiqlash</p>
              <p className="text-xs text-muted">Bu funksiya hali ishlab chiqilmoqda</p>
            </div>
          </div>
          <Badge tone="slate">Tez orada</Badge>
        </div>
      </SectionCard>
    </div>
  )
}

// ---------- Bildirishnomalar ----------
const DEFAULT_NOTIF_PREFS = { email: true, sound: true, lowStock: true }

function NotificationsTab({ me }) {
  const storageKey = `notif-prefs-${me?.id || 'guest'}`
  const [prefs, setPrefs] = useState(DEFAULT_NOTIF_PREFS)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) setPrefs({ ...DEFAULT_NOTIF_PREFS, ...JSON.parse(raw) })
    } catch {
      /* ignore malformed local prefs */
    }
  }, [storageKey])

  const toggle = (key) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try {
        localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        /* ignore quota / private mode */
      }
      return next
    })
  }

  return (
    <SectionCard title="Bildirishnoma sozlamalari" hint="Sozlamalar shu qurilmada saqlanadi">
      <div className="divide-y divide-slate-100">
        <PrefRow
          title="Email orqali bildirishnoma"
          hint="Muhim voqealar haqida email orqali xabar olish"
          checked={prefs.email}
          onChange={() => toggle('email')}
        />
        <PrefRow
          title="Ovozli bildirishnoma"
          hint="Yangi bildirishnoma kelganda ovozli signal"
          checked={prefs.sound}
          onChange={() => toggle('sound')}
        />
        <PrefRow
          title="Kam qoldiq haqida ogohlantirish"
          hint="Mahsulot qoldig'i minimal darajaga yetganda xabar olish"
          checked={prefs.lowStock}
          onChange={() => toggle('lowStock')}
        />
      </div>
    </SectionCard>
  )
}

function PrefRow({ title, hint, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  )
}

function Switch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition',
        checked ? 'bg-brand-600' : 'bg-slate-200',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition',
          checked ? 'left-[22px]' : 'left-0.5',
        )}
      />
    </button>
  )
}

// ---------- Tizim sozlamalari ----------
function SystemTab() {
  return (
    <SectionCard title="Umumiy tizim parametrlari" hint="Ombor tizimida qo'llaniladigan asosiy standartlar">
      <div className="divide-y divide-slate-100 -mx-5 -mb-5">
        <Row label="Tizim tili" value="O'zbekcha" />
        <Row label="Valyuta" value="so'm" />
        <Row label="Sana formati" value="kun.oy.yil" />
        <Row label="Vaqt zonasi" value="Toshkent (UTC+5)" />
      </div>
    </SectionCard>
  )
}

// ---------- Tashkilot ma'lumotlari ----------
function OrgTab({ org }) {
  if (!org) {
    return (
      <SectionCard title="Tashkilot ma'lumotlari">
        <EmptyState icon={Building2} title="Tashkilotga bog'lanmagansiz" />
      </SectionCard>
    )
  }
  return (
    <SectionCard title="Tashkilot ma'lumotlari" hint="Kompaniya va aloqa ma'lumotlari">
      <div className="mb-4 flex items-center gap-3.5 rounded-2xl bg-slate-50 p-4">
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-sm font-bold text-white"
          style={{ background: org.brandColor || '#3b6cf5' }}
        >
          {org.name?.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-bold text-ink">{org.name}</p>
          <p className="text-xs text-muted">tizims-ombor.uz/{org.slug}</p>
        </div>
      </div>
      <div className="divide-y divide-slate-100 -mx-5 -mb-5">
        <Row label="Tashkilot nomi" value={org.name} />
        <Row label="Identifikator (slug)" value={org.slug} />
      </div>
    </SectionCard>
  )
}

// ---------- Til va ko'rinish ----------
function AppearanceTab() {
  return (
    <div className="space-y-5">
      <SectionCard title="Til" hint="Interfeys tilini tanlang">
        <div className="grid gap-3 sm:grid-cols-2">
          <LangOption icon={Globe} label="O'zbekcha" active />
          <LangOption icon={Globe} label="Русский" disabled />
        </div>
      </SectionCard>
      <SectionCard title="Ko'rinish" hint="Interfeys temasini tanlang">
        <div className="grid gap-3 sm:grid-cols-2">
          <LangOption label="Yorug'" swatch="#ffffff" active />
          <LangOption label="Tungi rejim" swatch="#1a1d26" disabled />
        </div>
      </SectionCard>
    </div>
  )
}

function LangOption({ icon: Icon, label, swatch, active, disabled }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-2xl border p-4',
        active ? 'border-brand-200 bg-brand-50' : 'border-slate-100 bg-slate-50',
        disabled && 'opacity-60',
      )}
    >
      <div className="flex items-center gap-3">
        {swatch ? (
          <span className="h-8 w-8 shrink-0 rounded-lg border border-slate-200" style={{ background: swatch }} />
        ) : (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-slate-500">
            <Icon size={16} />
          </span>
        )}
        <span className="text-sm font-semibold text-ink">{label}</span>
      </div>
      {active ? (
        <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-white">
          <Check size={13} />
        </span>
      ) : (
        <Badge tone="slate">Tez orada</Badge>
      )}
    </div>
  )
}

// ---------- Zaxira nusxa ----------
function BackupTab() {
  return (
    <SectionCard title="Ma'lumotlar zaxira nusxasi" hint="Ombor ma'lumotlarini zaxiralash va tiklash">
      <EmptyState
        icon={DatabaseBackup}
        title="Bu funksiya hali ishlab chiqilmoqda"
        hint="Tez orada ma'lumotlarni zaxira nusxasini yuklab olish imkoniyati qo'shiladi"
      />
    </SectionCard>
  )
}
