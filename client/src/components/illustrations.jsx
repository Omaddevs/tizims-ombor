export function IlluParcel() {
  return (
    <svg viewBox="0 0 180 140" className="mx-auto h-[120px] w-[160px]" aria-hidden>
      <ellipse cx="96" cy="118" rx="52" ry="10" fill="#d8f3ea" />
      <circle cx="98" cy="78" r="46" fill="#c8f0e2" />
      <circle cx="62" cy="58" r="18" fill="#b7ead8" />
      <rect x="78" y="62" width="40" height="34" rx="6" fill="#f4b183" />
      <rect x="78" y="62" width="40" height="10" rx="4" fill="#e89a62" />
      <path d="M98 62v34" stroke="#d97745" strokeWidth="3" />
      <circle cx="86" cy="44" r="12" fill="#f8d5b8" />
      <path d="M76 42c2-10 18-12 22-2" fill="#2c3e50" />
      <path d="M70 78c8 10 22 18 40 8" fill="none" stroke="#3d8f7a" strokeWidth="6" strokeLinecap="round" />
      <rect x="70" y="86" width="18" height="22" rx="4" fill="#3b6cf5" />
      <rect x="108" y="90" width="16" height="18" rx="4" fill="#64748b" />
    </svg>
  )
}

export function IlluCalendar() {
  return (
    <svg viewBox="0 0 180 140" className="mx-auto h-[120px] w-[160px]" aria-hidden>
      <ellipse cx="92" cy="118" rx="50" ry="10" fill="#d9e8ff" />
      <circle cx="94" cy="76" r="48" fill="#cfe0ff" />
      <rect x="78" y="50" width="36" height="48" rx="8" fill="#fff" />
      <rect x="78" y="50" width="36" height="12" rx="6" fill="#3b6cf5" />
      <circle cx="88" cy="74" r="3" fill="#cbd5e1" />
      <circle cx="98" cy="74" r="3" fill="#cbd5e1" />
      <circle cx="108" cy="74" r="3" fill="#3b6cf5" />
      <circle cx="88" cy="84" r="3" fill="#cbd5e1" />
      <path d="M64 70c0-14 12-24 26-22" fill="none" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
      <circle cx="62" cy="52" r="11" fill="#f8d5b8" />
      <path d="M54 50c3-9 16-10 20 0" fill="#1e293b" />
      <rect x="52" y="64" width="22" height="28" rx="8" fill="#3b6cf5" />
    </svg>
  )
}

export function IlluOutbound({ className }) {
  return (
    <svg viewBox="0 0 180 140" className={className || 'mx-auto h-[110px] w-[150px]'} aria-hidden>
      <ellipse cx="96" cy="122" rx="48" ry="9" fill="#dbe7ff" />
      <circle cx="98" cy="72" r="52" fill="#e8f0ff" />
      <circle cx="98" cy="72" r="42" fill="#d7e4ff" />
      <path d="M70 78h56l-8 28H78z" fill="#f2b07a" />
      <path d="M70 78h56l-6 10H76z" fill="#e89a62" />
      <path d="M98 78v28" stroke="#d97745" strokeWidth="3" />
      <rect x="86" y="86" width="24" height="14" rx="2" fill="#f8d5b8" opacity="0.7" />
      <path d="M98 28v34" fill="none" stroke="#1e3a8a" strokeWidth="5" strokeLinecap="round" />
      <path d="M86 50l12 14 12-14" fill="none" stroke="#1e3a8a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IlluWelcome() {
  return (
    <svg viewBox="0 0 220 140" className="mx-auto h-[110px] w-[180px]" aria-hidden>
      <ellipse cx="110" cy="122" rx="58" ry="10" fill="#e0e7ff" />
      <circle cx="118" cy="72" r="50" fill="#dbe4ff" />
      <rect x="92" y="58" width="44" height="36" rx="8" fill="#fff" />
      <path d="M100 70h28M100 78h18" stroke="#3b6cf5" strokeWidth="3" strokeLinecap="round" />
      <circle cx="78" cy="50" r="14" fill="#f8d5b8" />
      <path d="M68 48c4-12 22-12 26 2" fill="#0f172a" />
      <rect x="64" y="66" width="28" height="32" rx="10" fill="#3b6cf5" />
      <rect x="138" y="78" width="22" height="22" rx="6" fill="#f4b183" />
    </svg>
  )
}
