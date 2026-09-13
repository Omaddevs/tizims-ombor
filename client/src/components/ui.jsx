import { AlertCircle, Inbox, Info, X } from 'lucide-react'

export function cn(...parts) {
  return parts.filter(Boolean).join(' ')
}

export function Avatar({ name, color, size = 'md' }) {
  const sizes = { sm: 'h-8 w-8 text-[11px]', md: 'h-9 w-9 text-xs', lg: 'h-14 w-14 text-lg', xl: 'h-20 w-20 text-2xl' }
  const initials = String(name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
  return (
    <div
      className={cn('grid shrink-0 place-items-center rounded-full font-bold text-white', sizes[size])}
      style={{ background: color || '#3b6cf5' }}
    >
      {initials}
    </div>
  )
}

export function Badge({ children, tone = 'slate' }) {
  const map = {
    green: 'bg-emerald-50 text-emerald-700',
    yellow: 'bg-amber-50 text-amber-700',
    red: 'bg-rose-50 text-rose-600',
    blue: 'bg-sky-50 text-sky-700',
    slate: 'bg-slate-100 text-slate-600',
    brand: 'bg-brand-50 text-brand-700',
    orange: 'bg-orange-50 text-orange-600',
    violet: 'bg-violet-50 text-violet-700',
  }
  return (
    <span className={cn('inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold', map[tone])}>
      {children}
    </span>
  )
}

export function Pill({ children, tone = 'brand' }) {
  const map = {
    brand: 'bg-brand-600 text-white',
    muted: 'bg-slate-100 text-slate-500',
    green: 'bg-emerald-500 text-white',
  }
  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold', map[tone])}>{children}</span>
  )
}

export function PageHeader({ title, crumbs = ['Asosiy'], subtitle, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1 basis-56">
        <p className="text-[13px] text-slate-400">{crumbs.join(' / ')}</p>
        <h1 className="mt-0.5 text-[26px] font-bold tracking-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-xl text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action ? (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">{action}</div>
      ) : null}
    </div>
  )
}

export function CardHead({ title, extra, hint }) {
  return (
    <div className="flex items-center justify-between gap-2 px-5 pt-4">
      <div className="flex min-w-0 items-center gap-1.5">
        <h3 className="truncate text-[15px] font-semibold text-ink">{title}</h3>
        {hint ? (
          <span title={hint} className="text-slate-300">
            <Info size={14} />
          </span>
        ) : null}
      </div>
      {extra}
    </div>
  )
}

export function ProgressBar({ value, tone }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0))
  const color =
    tone || (pct >= 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-brand-600' : pct >= 30 ? 'bg-amber-400' : 'bg-rose-500')
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Modal({ open, title, onClose, children, wide }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-end p-0 sm:place-items-center sm:p-6">
      <button className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose} aria-label="Yopish" />
      <div
        className={cn(
          'relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-[24px]',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        )}
      >
        <div className="sticky top-0 z-10 -mx-5 mb-4 flex items-start justify-between gap-3 bg-white px-5 pb-2 pt-0">
          <h3 className="text-lg font-bold text-ink">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children, hint, required }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-600">
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  )
}

export const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[16px] outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-50'

export const searchWrapClass =
  'flex min-w-[200px] flex-[1_1_220px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm'

export function Tabs({ value, onChange, items }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100/80 p-1">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onChange(it.id)}
          className={cn(
            'whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition',
            value === it.id ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-slate-800',
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

export function PrimaryBtn({ children, className, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(59,108,245,0.28)] transition hover:bg-brand-700 disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function SecondaryBtn({ children, className, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function DangerBtn({ children, className, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function StatCard({ title, value, sub, icon: Icon, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-rose-50 text-rose-500',
    green: 'bg-emerald-50 text-emerald-600',
  }
  return (
    <div className="card flex items-start justify-between p-5">
      <div className="min-w-0">
        <p className="text-[13px] text-muted">{title}</p>
        <p className="mt-1 break-words text-xl font-bold leading-tight lg:text-2xl">{value}</p>
        {sub && <p className="mt-1 text-xs font-medium text-muted">{sub}</p>}
      </div>
      {Icon && (
        <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', tones[tone])}>
          <Icon size={18} />
        </div>
      )}
    </div>
  )
}

export function KpiCard({ title, value, sub, icon: Icon, tone = 'brand', delta, onClick, active }) {
  const tones = {
    brand: { box: 'bg-brand-50 text-brand-600', delta: 'text-brand-600', ring: 'ring-brand-200' },
    green: { box: 'bg-emerald-50 text-emerald-600', delta: 'text-emerald-600', ring: 'ring-emerald-200' },
    amber: { box: 'bg-amber-50 text-amber-600', delta: 'text-amber-600', ring: 'ring-amber-200' },
    red: { box: 'bg-rose-50 text-rose-500', delta: 'text-rose-500', ring: 'ring-rose-200' },
    violet: { box: 'bg-violet-50 text-violet-600', delta: 'text-violet-600', ring: 'ring-violet-200' },
    orange: { box: 'bg-orange-50 text-orange-500', delta: 'text-orange-500', ring: 'ring-orange-200' },
  }
  const t = tones[tone] || tones.brand
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'card flex w-full items-start gap-3.5 p-5 text-left',
        onClick && 'transition hover:shadow-[0_8px_24px_rgba(16,24,40,0.08)]',
        active && `ring-2 ${t.ring}`,
      )}
    >
      {Icon ? (
        <div className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', t.box)}>
          <Icon size={20} />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-muted">{title}</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-2">
          <p className="text-2xl font-bold leading-none tracking-tight text-ink">{value}</p>
          {delta != null && delta !== '' ? <span className={cn('text-xs font-semibold', t.delta)}>{delta}</span> : null}
        </div>
        {sub ? <p className="mt-1.5 text-xs font-medium text-muted">{sub}</p> : null}
      </div>
    </Comp>
  )
}

export function RadialProgress({ value, size = 64, stroke = 7, color = '#3b6cf5', track = '#eef2f7', children }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        {children ?? <span className="text-sm font-bold text-ink">{pct}%</span>}
      </div>
    </div>
  )
}

export function EmptyState({ icon: Icon = Inbox, title, hint, illustration }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center text-slate-400">
      {illustration || <Icon size={32} strokeWidth={1.6} />}
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      {hint && <p className="max-w-xs text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

export function ErrorNote({ children }) {
  if (!children) return null
  return (
    <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
      <AlertCircle size={15} className="shrink-0" />
      {children}
    </p>
  )
}
