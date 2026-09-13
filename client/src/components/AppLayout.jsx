import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import {
  Bell,
  Boxes,
  Building2,
  ClipboardList,
  CircleHelp,
  LayoutDashboard,
  ListTree,
  LogOut,
  Menu,
  PackageMinus,
  PackagePlus,
  PanelLeftClose,
  PanelLeftOpen,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  UserSquare2,
  Users,
  X,
} from 'lucide-react'
import { useAuthStore, useCurrentUser } from '../store/useAuthStore'
import { Avatar, Modal, cn } from './ui'
import SearchModal from './SearchModal'
import { ROLE_LABEL } from '../lib/format'
import { useNotifications } from '../api/queries'

const NAV_GROUPS = [
  {
    label: null,
    items: [{ to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['super_admin', 'admin', 'manager', 'employee'] }],
  },
  {
    label: 'Ombor',
    items: [
      { to: '/products', icon: Boxes, label: 'Mahsulotlar', roles: ['admin', 'manager'] },
      { to: '/categories', icon: ListTree, label: 'Kategoriyalar', roles: ['admin', 'manager'] },
      { to: '/stock-in', icon: PackagePlus, label: 'Kirim', roles: ['admin', 'manager'] },
      { to: '/stock-out', icon: PackageMinus, label: 'Chiqim / Biriktirish', roles: ['admin', 'manager'] },
      { to: '/scan', icon: ScanLine, label: 'Skanerlash', roles: ['admin', 'manager'] },
    ],
  },
  {
    label: 'Xodimlar',
    items: [
      { to: '/employees', icon: UserSquare2, label: 'Xodimlar', roles: ['admin', 'manager'] },
      { to: '/assignments', icon: ClipboardList, label: 'Biriktirmalar', roles: ['admin', 'manager', 'employee'] },
    ],
  },
  {
    label: 'Hisobotlar',
    items: [
      { to: '/transactions', icon: ClipboardList, label: 'Kirim-chiqim jurnali', roles: ['admin', 'manager'] },
      { to: '/reports', icon: ShieldCheck, label: 'Hisobotlar', roles: ['admin', 'manager'] },
    ],
  },
  {
    label: 'Tizim',
    items: [
      { to: '/users', icon: Users, label: 'Foydalanuvchilar', roles: ['admin'] },
      { to: '/organizations', icon: Building2, label: 'Tashkilotlar', roles: ['super_admin'] },
    ],
  },
]

const SEARCHABLE = [
  ...NAV_GROUPS.flatMap((g) => g.items),
  { to: '/notifications', icon: Bell, label: 'Bildirishnomalar', roles: ['super_admin', 'admin', 'manager', 'employee'] },
  { to: '/settings', icon: Settings, label: 'Sozlamalar', roles: ['super_admin', 'admin', 'manager', 'employee'] },
]

export default function AppLayout() {
  const me = useCurrentUser()
  const org = useAuthStore((s) => s.org)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar-collapsed') === '1'
    } catch {
      return false
    }
  })
  const [searchOpen, setSearchOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const { data: notifications } = useNotifications()
  const unread = (notifications || []).filter((n) => !n.read).length

  const groups = useMemo(
    () =>
      NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(me?.role)) })).filter((g) => g.items.length),
    [me?.role],
  )
  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups])
  const searchable = useMemo(() => SEARCHABLE.filter((i) => i.roles.includes(me?.role)), [me?.role])

  const doLogout = () => {
    logout()
    navigate('/login')
  }

  useEffect(() => {
    try {
      localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '0')
    } catch {
      /* ignore quota / private mode */
    }
  }, [collapsed])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const NavList = ({ onClick, collapsed: mini }) => (
    <nav
      className={cn(
        'flex min-h-0 flex-1 flex-col overflow-y-auto py-3 scrollbar-thin',
        mini ? 'gap-1 px-2' : 'gap-4 px-3',
      )}
    >
      {groups.map((group) => (
        <div key={group.label || 'main'}>
          {group.label && !mini && (
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{group.label}</p>
          )}
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onClick}
                  title={mini ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center whitespace-nowrap rounded-xl text-[13.5px] font-medium transition',
                      mini ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
                      isActive ? 'bg-[#e8eeff] text-brand-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700',
                    )
                  }
                >
                  <Icon size={18} strokeWidth={1.85} className="shrink-0" />
                  {!mini && item.label}
                </NavLink>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )

  const FooterNav = ({ onClick, collapsed: mini }) => (
    <div className={cn('mt-auto space-y-0.5 border-t border-slate-100 py-3', mini ? 'px-2' : 'px-3')}>
      <button
        type="button"
        title={mini ? 'Qidirish' : undefined}
        onClick={() => {
          onClick?.()
          setSearchOpen(true)
        }}
        className={cn(
          'flex w-full items-center whitespace-nowrap rounded-xl py-2.5 text-[13.5px] font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700',
          mini ? 'justify-center px-0' : 'gap-3 px-3',
        )}
      >
        <Search size={18} className="shrink-0" />
        {!mini && <span className="flex-1 text-left">Qidirish</span>}
        {!mini && <span className="kbd">Ctrl K</span>}
      </button>
      <button
        type="button"
        title={mini ? 'Sozlamalar' : undefined}
        onClick={() => {
          onClick?.()
          navigate('/settings')
        }}
        className={cn(
          'flex w-full items-center whitespace-nowrap rounded-xl py-2.5 text-[13.5px] font-medium',
          mini ? 'justify-center px-0' : 'gap-3 px-3',
          location.pathname === '/settings'
            ? 'bg-[#e8eeff] text-brand-600'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700',
        )}
      >
        <Settings size={18} className="shrink-0" />
        {!mini && 'Sozlamalar'}
      </button>
      <button
        type="button"
        title={mini ? "Yordam va yo'riqnoma" : undefined}
        onClick={() => {
          onClick?.()
          setHelpOpen(true)
        }}
        className={cn(
          'flex w-full items-center whitespace-nowrap rounded-xl py-2.5 text-[13.5px] font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700',
          mini ? 'justify-center px-0' : 'gap-3 px-3',
        )}
      >
        <CircleHelp size={18} className="shrink-0" />
        {!mini && "Yordam va yo'riqnoma"}
      </button>
      <button
        type="button"
        title={mini ? 'Chiqish' : undefined}
        onClick={doLogout}
        className={cn(
          'flex w-full items-center whitespace-nowrap rounded-xl py-2.5 text-[13.5px] font-medium text-rose-500 hover:bg-rose-50',
          mini ? 'justify-center px-0' : 'gap-3 px-3',
        )}
      >
        <LogOut size={18} className="shrink-0" />
        {!mini && 'Chiqish'}
      </button>
    </div>
  )

  const Brand = ({ onClick, close, collapsed: mini, onToggle }) => (
    <div
      className={cn(
        'border-b border-slate-100',
        mini ? 'flex flex-col items-center gap-2 px-2 py-3' : 'flex items-center justify-between px-3 py-4',
      )}
    >
      <button type="button" onClick={onClick} className="flex min-w-0 items-center gap-2" title="Dashboard">
        <img src="/logo.svg" alt="" className="h-10 w-10 shrink-0 object-contain" />
        {!mini && <span className="truncate text-[13px] font-extrabold tracking-tight text-ink">TIZIMSOMBOR.UZ</span>}
      </button>
      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          className="hidden h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 lg:grid"
          aria-label={mini ? 'Menyuni ochish' : 'Menyuni yopish'}
          title={mini ? 'Menyuni ochish' : 'Menyuni yopish'}
        >
          {mini ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      )}
      {close}
    </div>
  )

  return (
    <div className="flex min-h-dvh bg-[#f4f6fb]">
      <aside
        className={cn(
          'sticky top-0 hidden h-dvh min-h-0 shrink-0 flex-col overflow-hidden border-r border-slate-100 bg-white transition-[width] duration-200 ease-out lg:flex',
          collapsed ? 'w-[72px]' : 'w-[240px] xl:w-[264px]',
        )}
      >
        <Brand
          onClick={() => navigate('/')}
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
        />
        <NavList collapsed={collapsed} />
        <FooterNav collapsed={collapsed} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-slate-900/30" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs min-h-0 flex-col overflow-hidden border-r border-slate-100 bg-white shadow-2xl">
            <Brand
              onClick={() => {
                setOpen(false)
                navigate('/')
              }}
              close={
                <button onClick={() => setOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-50">
                  <X size={18} />
                </button>
              }
            />
            <NavList onClick={() => setOpen(false)} />
            <FooterNav onClick={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#f4f6fb]">
        <header className="sticky top-0 z-40 border-b border-slate-100 bg-white">
          <div className="flex h-[58px] items-center gap-3 px-4 lg:px-6">
            <button
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Menyu"
            >
              <Menu size={18} />
            </button>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden max-w-sm flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-left text-sm text-slate-400 transition hover:bg-slate-100 md:flex"
            >
              <Search size={15} className="shrink-0" />
              <span className="flex-1 truncate">Qidirish...</span>
              <span className="kbd">Ctrl K</span>
            </button>

            <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
              {org?.name && (
                <span className="hidden max-w-[220px] truncate rounded-full border border-slate-100 bg-slate-50 px-3 py-1 text-[12px] font-medium text-slate-600 md:inline">
                  {org.name}
                </span>
              )}
              <span className="hidden rounded-full border border-slate-100 bg-slate-50 px-3 py-1 text-[12px] font-medium text-slate-600 sm:inline">
                {ROLE_LABEL[me?.role]}
              </span>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                aria-label="Qidirish"
              >
                <Search size={16} />
              </button>
              <button
                type="button"
                onClick={() => navigate('/notifications')}
                className="relative grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                aria-label="Bildirishnomalar"
              >
                <Bell size={16} />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </button>
              <button type="button" onClick={() => navigate('/settings')} className="relative rounded-full">
                <Avatar name={me?.name} color={me?.avatarColor} />
              </button>
            </div>
          </div>
        </header>

        <main className="safe-bottom mx-auto w-full max-w-[1440px] px-4 py-5 lg:px-7 lg:py-6 xl:px-8">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-100 bg-white px-1 pb-[calc(0.35rem+env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_rgba(15,23,42,0.05)] lg:hidden">
        <div className="flex items-stretch justify-between overflow-x-auto no-scrollbar">
          {flatItems.slice(0, 5).map((item) => {
            const Icon = item.icon
            const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
            return (
              <button
                key={item.to}
                type="button"
                onClick={() => navigate(item.to)}
                className="flex flex-1 flex-col items-center gap-0.5 px-1 py-1 text-[10px] font-medium"
              >
                <span
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-full transition',
                    active ? 'bg-brand-50 text-brand-600' : 'text-slate-400',
                  )}
                >
                  <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                </span>
                <span className={cn('leading-tight', active ? 'font-semibold text-brand-600' : 'text-slate-400')}>
                  {item.label.split(' ')[0]}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} items={searchable} />

      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Yordam va yo'riqnoma">
        <div className="space-y-3 text-sm text-slate-600">
          <p>Universitet omborini shu yerdan boshqarasiz: mahsulotlar, kirim-chiqim, xodimlarga biriktirish va hisobotlar.</p>
          <ul className="space-y-2 rounded-2xl bg-slate-50 p-4 text-[13px]">
            <li>
              <b>Ctrl + K</b> — sahifalar bo'yicha qidirish
            </li>
            <li>
              <b>Kirim</b> — omborga yangi tovar qabul qilish
            </li>
            <li>
              <b>Chiqim</b> — sarf yoki xodimga biriktirish
            </li>
            <li>
              <b>Skanerlash</b> — shtrix-kod, badge yoki QR orqali topish
            </li>
          </ul>
        </div>
      </Modal>
    </div>
  )
}
