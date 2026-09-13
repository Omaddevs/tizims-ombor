import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from './ui'

export function Select({ value, onChange, options, placeholder = 'Tanlang', variant, align = 'left', className }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const pill = variant === 'pill'

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 text-left transition',
          pill
            ? 'rounded-full bg-slate-100 px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-200'
            : inputWrapClass,
        )}
      >
        <span className={cn('truncate', !current && 'text-slate-400')}>{current ? current.label : placeholder}</span>
        <ChevronDown size={pill ? 13 : 16} className={cn('shrink-0 text-slate-400 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          className={cn(
            'absolute top-[calc(100%+6px)] z-30 max-h-64 min-w-full overflow-y-auto rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-slate-100 scrollbar-thin',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center justify-between gap-3 whitespace-nowrap rounded-xl px-3 py-2 text-left text-sm font-medium hover:bg-slate-50',
                o.value === value ? 'text-brand-700' : 'text-slate-600',
              )}
            >
              {o.label}
              {o.value === value && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const inputWrapClass =
  'w-full justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-50'
