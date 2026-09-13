import { useState } from 'react'
import { Building2, Plus } from 'lucide-react'
import { useCreateOrg, useOrgsAdmin } from '../api/queries'
import { useAuthStore } from '../store/useAuthStore'
import { ErrorNote, Field, Modal, PageHeader, PrimaryBtn, inputClass } from '../components/ui'

export default function Organizations() {
  const { data: orgs, isLoading } = useOrgsAdmin(true)
  const pickOrg = useAuthStore((s) => s.pickOrg)
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title="Tashkilotlar"
        crumbs={['Asosiy', 'Tashkilotlar']}
        action={
          <PrimaryBtn onClick={() => setOpen(true)}>
            <Plus size={16} /> Yangi tashkilot
          </PrimaryBtn>
        }
      />

      {isLoading && <p className="py-10 text-center text-sm text-muted">Yuklanmoqda...</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(orgs || []).map((o) => (
          <button
            key={o.id}
            onClick={() => pickOrg(o.id)}
            className="card flex items-center gap-3 p-4 text-left transition hover:shadow-lg"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white" style={{ background: o.brandColor }}>
              <Building2 size={18} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{o.name}</p>
              <p className="text-xs text-muted">
                {o.productsCount} mahsulot · {o.employeesCount} xodim · {o.usersCount} foydalanuvchi
              </p>
            </div>
          </button>
        ))}
      </div>

      <NewOrgModal open={open} onClose={() => setOpen(false)} />
    </div>
  )
}

function NewOrgModal({ open, onClose }) {
  const create = useCreateOrg()
  const [form, setForm] = useState({ name: '', slug: '', adminName: '', adminUsername: '', adminPassword: '' })
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await create.mutateAsync(form)
      setForm({ name: '', slug: '', adminName: '', adminUsername: '', adminPassword: '' })
      onClose()
    } catch (e2) {
      setError(e2.message)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Yangi tashkilot yaratish" wide>
      <form onSubmit={submit} className="space-y-3.5">
        <Field label="Tashkilot nomi">
          <input className={inputClass} value={form.name} onChange={set('name')} required />
        </Field>
        <Field label="Slug" hint="Login ekranida ishlatiladigan noyob kod, masalan: tdtu-uni">
          <input className={inputClass} value={form.slug} onChange={set('slug')} required />
        </Field>
        <div className="grid gap-3.5 sm:grid-cols-3">
          <Field label="Admin ismi">
            <input className={inputClass} value={form.adminName} onChange={set('adminName')} required />
          </Field>
          <Field label="Admin login">
            <input className={inputClass} value={form.adminUsername} onChange={set('adminUsername')} required />
          </Field>
          <Field label="Admin paroli">
            <input type="password" className={inputClass} value={form.adminPassword} onChange={set('adminPassword')} required minLength={6} />
          </Field>
        </div>
        <ErrorNote>{error}</ErrorNote>
        <PrimaryBtn type="submit" disabled={create.isPending} className="w-full">
          {create.isPending ? 'Yaratilmoqda...' : 'Tashkilot yaratish'}
        </PrimaryBtn>
      </form>
    </Modal>
  )
}
