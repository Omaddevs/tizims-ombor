import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Archive,
  Armchair,
  Boxes,
  Cable,
  FolderOpen,
  Laptop,
  LayoutGrid,
  LayoutList,
  Lightbulb,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Router,
  Search,
  Shield,
  ShoppingBasket,
  Trash2,
  Tv,
} from 'lucide-react'
import { useCurrentUser } from '../store/useAuthStore'
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useProducts,
  useUpdateCategory,
} from '../api/queries'
import { DataTable } from '../components/DataTable'
import { Select } from '../components/Select'
import {
  Badge,
  EmptyState,
  ErrorNote,
  Field,
  KpiCard,
  Modal,
  PageHeader,
  PrimaryBtn,
  SecondaryBtn,
  cn,
  inputClass,
  searchWrapClass,
} from '../components/ui'

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Nomi bo\'yicha (A → Z)' },
  { value: 'name-desc', label: 'Nomi bo\'yicha (Z → A)' },
  { value: 'count-desc', label: 'Mahsulot soni (ko\'p → kam)' },
  { value: 'count-asc', label: 'Mahsulot soni (kam → ko\'p)' },
]

const ICON_OPTIONS = [
  { id: 'package', Icon: Package },
  { id: 'laptop', Icon: Laptop },
  { id: 'armchair', Icon: Armchair },
  { id: 'pencil', Icon: Pencil },
  { id: 'cable', Icon: Cable },
  { id: 'tv', Icon: Tv },
  { id: 'router', Icon: Router },
  { id: 'lightbulb', Icon: Lightbulb },
  { id: 'shield', Icon: Shield },
  { id: 'basket', Icon: ShoppingBasket },
  { id: 'boxes', Icon: Boxes },
  { id: 'archive', Icon: Archive },
]

const ICON_MAP = Object.fromEntries(ICON_OPTIONS.map((o) => [o.id, o.Icon]))

const ICON_TONES = [
  'bg-sky-50 text-sky-600',
  'bg-violet-50 text-violet-600',
  'bg-emerald-50 text-emerald-600',
  'bg-cyan-50 text-cyan-600',
  'bg-brand-50 text-brand-600',
  'bg-amber-50 text-amber-600',
  'bg-orange-50 text-orange-600',
  'bg-slate-100 text-slate-500',
]

function iconTone(id) {
  const n = String(id || '').split('').reduce((s, ch) => s + ch.charCodeAt(0), 0)
  return ICON_TONES[n % ICON_TONES.length]
}

function CategoryIcon({ name, className }) {
  const Icon = ICON_MAP[name] || Package
  return <Icon size={20} className={className} />
}

function describe(cat, items) {
  if (cat.description) return cat.description
  const names = items.slice(0, 3).map((p) => p.name)
  if (!names.length) return 'Hozircha mahsulot yo\'q'
  return names.join(', ')
}

function statusOf(cat, items) {
  if (cat.archived) return { label: 'Arxivlangan', tone: 'red' }
  if (!items.length) return { label: 'Bo\'sh', tone: 'slate' }
  if (items.some((p) => p.quantity <= p.minStock)) return { label: 'Kam mahsulot', tone: 'yellow' }
  return { label: 'Faol', tone: 'green' }
}

export default function Categories() {
  const navigate = useNavigate()
  const me = useCurrentUser()
  const canDelete = me?.role === 'admin'
  const { data: categories, isLoading } = useCategories()
  const { data: products } = useProducts()
  const del = useDeleteCategory()
  const update = useUpdateCategory()

  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('name-asc')
  const [view, setView] = useState('cards')
  const [kpi, setKpi] = useState('all')
  const [error, setError] = useState('')
  const [modal, setModal] = useState({ open: false, category: null })

  const byCategory = useMemo(() => {
    const map = new Map()
    for (const p of products || []) {
      const list = map.get(p.categoryId) || []
      list.push(p)
      map.set(p.categoryId, list)
    }
    return map
  }, [products])

  const rows = useMemo(() => {
    return (categories || []).map((c) => {
      const items = byCategory.get(c.id) || []
      return {
        ...c,
        items,
        count: items.length,
        descriptionText: describe(c, items),
        status: statusOf(c, items),
      }
    })
  }, [categories, byCategory])

  const activeCount = rows.filter((c) => !c.archived).length
  const archivedCount = rows.filter((c) => c.archived).length
  const totalProducts = (products || []).length
  const totalCats = rows.length
  const activePct = totalCats ? `${Math.round((activeCount / totalCats) * 100)}%` : '0%'
  const archivedPct = totalCats ? `${Math.round((archivedCount / totalCats) * 100)}%` : '0%'

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = rows.filter((c) => {
      if (kpi === 'active' && c.archived) return false
      if (kpi === 'archived' && !c.archived) return false
      if (!q) return true
      return c.name.toLowerCase().includes(q) || c.descriptionText.toLowerCase().includes(q)
    })
    list = [...list].sort((a, b) => {
      if (sort === 'name-desc') return b.name.localeCompare(a.name, 'uz')
      if (sort === 'count-desc') return b.count - a.count || a.name.localeCompare(b.name, 'uz')
      if (sort === 'count-asc') return a.count - b.count || a.name.localeCompare(b.name, 'uz')
      return a.name.localeCompare(b.name, 'uz')
    })
    return list
  }, [rows, search, sort, kpi])

  const openProducts = (cat) => navigate(`/products?categoryId=${encodeURIComponent(cat.id)}`)

  const remove = async (cat) => {
    if (!confirm(`"${cat.name}" kategoriyasini o'chirmoqchimisiz?`)) return
    setError('')
    try {
      await del.mutateAsync(cat.id)
    } catch (e) {
      setError(e.message)
    }
  }

  const toggleArchive = async (cat) => {
    setError('')
    try {
      await update.mutateAsync({ id: cat.id, archived: !cat.archived })
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title="Kategoriyalar"
        crumbs={['Asosiy', 'Kategoriyalar']}
        subtitle="Mahsulot kategoriyalarini boshqarish, qo'shish va tahrirlash."
        action={
          <PrimaryBtn onClick={() => setModal({ open: true, category: null })}>
            <Plus size={16} /> Yangi kategoriya
          </PrimaryBtn>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Jami kategoriyalar"
          value={totalCats}
          sub="Barcha kategoriyalar soni"
          icon={FolderOpen}
          tone="brand"
          onClick={() => setKpi('all')}
        />
        <KpiCard
          title="Jami mahsulotlar"
          value={totalProducts}
          sub="Ombordagi mahsulot turlari"
          icon={Package}
          tone="brand"
          onClick={() => navigate('/products')}
        />
        <KpiCard
          title="Faol kategoriyalar"
          value={activeCount}
          delta={activePct}
          sub="Ishlatilayotgan kategoriyalar"
          icon={Boxes}
          tone="green"
          active={kpi === 'active'}
          onClick={() => setKpi(kpi === 'active' ? 'all' : 'active')}
        />
        <KpiCard
          title="Arxivlangan"
          value={archivedCount}
          delta={archivedPct}
          sub="Arxivdagi kategoriyalar"
          icon={Archive}
          tone="red"
          active={kpi === 'archived'}
          onClick={() => setKpi(kpi === 'archived' ? 'all' : 'archived')}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className={cn(searchWrapClass, 'min-w-[220px] flex-[1_1_16rem]')}>
          <Search size={16} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kategoriya nomi bo'yicha qidirish..."
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <Select value={sort} onChange={setSort} options={SORT_OPTIONS} className="w-56 shrink-0" />
        {(search || kpi !== 'all') && (
          <button
            type="button"
            onClick={() => {
              setSearch('')
              setKpi('all')
            }}
            className="text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            Tozalash
          </button>
        )}
        <div className="flex shrink-0 gap-1 rounded-xl bg-slate-100/80 p-1 lg:ml-auto">
          <button
            type="button"
            onClick={() => setView('cards')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
              view === 'cards' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-800',
            )}
          >
            <LayoutGrid size={14} /> Kartochkalar
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
              view === 'list' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-800',
            )}
          >
            <LayoutList size={14} /> Ro'yxat
          </button>
        </div>
      </div>

      <ErrorNote>{error}</ErrorNote>

      {isLoading && <p className="py-10 text-center text-sm text-muted">Yuklanmoqda...</p>}

      {!isLoading && view === 'cards' && (
        visible.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visible.map((cat) => (
              <CategoryCard
                key={cat.id}
                cat={cat}
                canDelete={canDelete}
                onOpen={() => openProducts(cat)}
                onEdit={() => setModal({ open: true, category: cat })}
                onArchive={() => toggleArchive(cat)}
                onDelete={() => remove(cat)}
              />
            ))}
          </div>
        ) : (
          <div className="card">
            <EmptyState
              title={search || kpi !== 'all' ? 'Mos kategoriya topilmadi' : 'Kategoriya yo\'q'}
              hint="Yangi kategoriya qo'shing yoki qidiruv shartini o'zgartiring."
            />
          </div>
        )
      )}

      {!isLoading && view === 'list' && (
        <DataTable
          rows={visible}
          empty={search || kpi !== 'all' ? 'Mos kategoriya topilmadi' : 'Kategoriya yo\'q'}
          emptyHint="Yangi kategoriya qo'shing yoki qidiruv shartini o'zgartiring."
          columns={[
            {
              key: 'name',
              label: 'Kategoriya',
              render: (r) => (
                <button type="button" onClick={() => openProducts(r)} className="flex min-w-0 items-center gap-3 text-left">
                  <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-2xl', iconTone(r.id))}>
                    <CategoryIcon name={r.icon} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink">{r.name}</span>
                    <span className="block truncate text-xs font-normal text-muted">{r.descriptionText}</span>
                  </span>
                </button>
              ),
            },
            { key: 'count', label: 'Mahsulotlar', render: (r) => `${r.count} ta` },
            { key: 'status', label: 'Holat', render: (r) => <Badge tone={r.status.tone}>{r.status.label}</Badge> },
            {
              key: 'actions',
              label: 'Amallar',
              render: (r) => (
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModal({ open: true, category: r })}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
                  >
                    <Pencil size={14} /> Tahrirlash
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => remove(r)}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-rose-500 hover:text-rose-600"
                    >
                      <Trash2 size={14} /> O'chirish
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}

      <CategoryModal
        open={modal.open}
        category={modal.category}
        onClose={() => setModal({ open: false, category: null })}
      />
    </div>
  )
}

function CategoryCard({ cat, canDelete, onOpen, onEdit, onArchive, onDelete }) {
  return (
    <article className={cn('card flex flex-col p-5', cat.archived && 'opacity-80')}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onOpen}
          className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-2xl transition hover:opacity-90', iconTone(cat.id))}
          aria-label={`${cat.name} mahsulotlari`}
        >
          <CategoryIcon name={cat.icon} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <button type="button" onClick={onOpen} className="min-w-0 text-left">
              <p className="truncate font-semibold text-ink">{cat.name}</p>
              <p className="mt-0.5 text-xs text-muted">{cat.count} mahsulot</p>
            </button>
            <CardMenu archived={cat.archived} canDelete={canDelete} onEdit={onEdit} onArchive={onArchive} onDelete={onDelete} />
          </div>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 min-h-[40px] text-[13px] leading-5 text-muted">{cat.descriptionText}</p>
      <div className="mt-3">
        <Badge tone={cat.status.tone}>{cat.status.label}</Badge>
      </div>

      <div className="mt-auto flex items-center gap-4 pt-4">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          <Pencil size={14} /> Tahrirlash
        </button>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-500 hover:text-rose-600"
          >
            <Trash2 size={14} /> O'chirish
          </button>
        )}
      </div>
    </article>
  )
}

function CardMenu({ archived, canDelete, onEdit, onArchive, onDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
        aria-label="Yana"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] z-20 min-w-[160px] rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-slate-100">
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onEdit()
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <Pencil size={14} /> Tahrirlash
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onArchive()
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <Archive size={14} /> {archived ? 'Faollashtirish' : 'Arxivlash'}
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onDelete()
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-500 hover:bg-rose-50"
            >
              <Trash2 size={14} /> O'chirish
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function CategoryModal({ open, onClose, category }) {
  const create = useCreateCategory()
  const update = useUpdateCategory()
  const [form, setForm] = useState({ name: '', description: '', icon: 'package', archived: false })
  const [error, setError] = useState('')
  const editing = Boolean(category)

  useEffect(() => {
    if (!open) return
    setError('')
    setForm({
      name: category?.name || '',
      description: category?.description || '',
      icon: category?.icon || 'package',
      archived: Boolean(category?.archived),
    })
  }, [open, category])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (editing) {
        await update.mutateAsync({ id: category.id, ...form })
      } else {
        await create.mutateAsync({ name: form.name, description: form.description, icon: form.icon })
      }
      onClose()
    } catch (e2) {
      setError(e2.message)
    }
  }

  const pending = create.isPending || update.isPending

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'}>
      <form onSubmit={submit} className="space-y-3.5">
        <Field label="Nomi">
          <input className={inputClass} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required autoFocus />
        </Field>
        <Field label="Tavsif" hint="Kartochkada ko'rinadi, ixtiyoriy">
          <textarea
            className={cn(inputClass, 'min-h-[88px] resize-y')}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Masalan: Noutbuk, monitor, klaviatura va boshqalar"
          />
        </Field>
        <Field label="Ikonka">
          <div className="grid grid-cols-6 gap-2">
            {ICON_OPTIONS.map(({ id, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setForm((f) => ({ ...f, icon: id }))}
                className={cn(
                  'grid h-11 place-items-center rounded-xl border transition',
                  form.icon === id
                    ? 'border-brand-500 bg-brand-50 text-brand-600 ring-4 ring-brand-50'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50',
                )}
                aria-label={id}
              >
                <Icon size={18} />
              </button>
            ))}
          </div>
        </Field>
        {editing && (
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <input
              type="checkbox"
              checked={form.archived}
              onChange={(e) => setForm((f) => ({ ...f, archived: e.target.checked }))}
              className="h-4 w-4 accent-brand-600"
            />
            Arxivlangan
          </label>
        )}
        <ErrorNote>{error}</ErrorNote>
        <div className="flex gap-2">
          <SecondaryBtn type="button" onClick={onClose} className="flex-1">
            Bekor qilish
          </SecondaryBtn>
          <PrimaryBtn type="submit" disabled={pending} className="flex-1">
            {pending ? 'Saqlanmoqda...' : 'Saqlash'}
          </PrimaryBtn>
        </div>
      </form>
    </Modal>
  )
}
