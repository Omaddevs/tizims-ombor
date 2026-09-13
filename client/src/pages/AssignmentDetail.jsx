import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, DoorOpen, Download, Package, RotateCcw, UserRound } from 'lucide-react'
import {
  useAssignment,
  useConfirmAssignment,
  useReturnAssignment,
  useUpdateAssignment,
} from '../api/queries'
import { useCurrentUser } from '../store/useAuthStore'
import { Avatar, Badge, ErrorNote, Field, PageHeader, PrimaryBtn, SecondaryBtn } from '../components/ui'
import { FileDrop } from '../components/FileDrop'
import { AssignmentQrLabel } from '../components/QrLabel'
import { assignmentTarget } from '../lib/assignment'
import { formatDate } from '../lib/format'

const STATUS_LABEL = { active: 'Foydalanishda', pending: 'Tasdiq kutilmoqda', returned: 'Qaytarilgan' }
const STATUS_TONE = { active: 'green', pending: 'orange', returned: 'red' }
const AVATAR_COLORS = ['#3b6cf5', '#7c3aed', '#0d9488', '#f59e0b', '#f43f5e', '#0284c7', '#059669', '#64748b']

function colorFor(name = '') {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export default function AssignmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const me = useCurrentUser()
  const isStaff = ['admin', 'manager'].includes(me?.role)
  const { data: row, isLoading, error } = useAssignment(id)
  const confirmAssignment = useConfirmAssignment()
  const returnAssignment = useReturnAssignment()
  const update = useUpdateAssignment()
  const [formError, setFormError] = useState('')

  useEffect(() => {
    setFormError('')
  }, [id])

  if (isLoading) return <p className="py-10 text-center text-sm text-muted">Yuklanmoqda...</p>
  if (error || !row) {
    return (
      <div className="space-y-4 pb-6">
        <PageHeader title="Biriktirma" crumbs={['Asosiy', 'Biriktirmalar']} />
        <p className="text-sm text-rose-600">{error?.message || 'Biriktirma topilmadi'}</p>
        <SecondaryBtn onClick={() => navigate('/assignments')}>Ro'yxatga qaytish</SecondaryBtn>
      </div>
    )
  }

  const target = assignmentTarget(row)
  const pending = confirmAssignment.isPending || returnAssignment.isPending || update.isPending

  const attach = async (url, meta) => {
    setFormError('')
    try {
      await update.mutateAsync({
        id: row.id,
        documentUrl: url,
        documentName: url ? meta?.name || null : null,
        documentSize: url ? meta?.size || null : null,
      })
    } catch (e) {
      setFormError(e.message)
    }
  }

  const doConfirm = async () => {
    try {
      await confirmAssignment.mutateAsync(row.id)
    } catch (e) {
      setFormError(e.message)
    }
  }

  const doReturn = async () => {
    if (!window.confirm(`"${row.product?.name || 'Buyum'}" ni omborga qaytarmoqchimisiz?`)) return
    try {
      await returnAssignment.mutateAsync(row.id)
    } catch (e) {
      setFormError(e.message)
    }
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={row.product?.name || 'Biriktirma'}
        crumbs={['Asosiy', 'Biriktirmalar', row.assetTag || 'Batafsil']}
        subtitle="QR kodni skanerlang — mahsulot qaysi xona yoki xodimga biriktirilgani chiqadi."
      />
      <button
        type="button"
        onClick={() => navigate('/assignments')}
        className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-slate-600"
      >
        <ArrowLeft size={16} /> Biriktirmalar
      </button>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex flex-wrap items-start gap-3">
              {row.product?.photoUrl ? (
                <img src={row.product.photoUrl} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-1 ring-slate-100" />
              ) : (
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-slate-50 text-slate-400">
                  <Package size={24} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {isStaff && row.productId ? (
                    <Link to={`/products/${row.productId}`} className="text-lg font-extrabold text-ink hover:text-brand-700">
                      {row.product?.name || '—'}
                    </Link>
                  ) : (
                    <h1 className="text-lg font-extrabold">{row.product?.name || '—'}</h1>
                  )}
                  <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {row.assetTag} · {row.quantity} {row.product?.unit || 'dona'}
                </p>
                {row.product?.barcode ? (
                  <p className="mt-0.5 font-mono text-xs text-slate-500">{row.product.barcode}</p>
                ) : null}
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Biriktirilgan</p>
              <div className="mt-2 flex items-center gap-3">
                {target.kind === 'room' ? (
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm">
                    <DoorOpen size={20} />
                  </span>
                ) : (
                  <Avatar name={target.title} color={colorFor(target.title)} />
                )}
                <div className="min-w-0">
                  {isStaff && row.employeeId ? (
                    <Link to={`/employees/${row.employeeId}`} className="font-semibold text-ink hover:text-brand-700">
                      {target.title}
                    </Link>
                  ) : (
                    <p className="font-semibold text-ink">{target.title}</p>
                  )}
                  <p className="text-xs text-muted">{target.subtitle}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <InfoRow label="Biriktirilgan sana" value={formatDate(row.assignedAt, true)} />
              <InfoRow
                label="Tasdiqlangan"
                value={row.confirmedAt ? formatDate(row.confirmedAt, true) : row.targetType === 'room' ? 'Xona (avto)' : '—'}
              />
              <InfoRow label="Qaytarilgan" value={row.returnedAt ? formatDate(row.returnedAt, true) : '—'} />
            </div>

            {row.documentUrl ? (
              <a
                href={row.documentUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                <Download size={15} /> Hujjatni ochish
                {row.documentName ? <span className="font-normal text-muted">({row.documentName})</span> : null}
              </a>
            ) : null}

            {isStaff && (
              <div className="mt-4">
                <Field label="Fayl biriktirish">
                  <FileDrop value={row.documentUrl} onChange={attach} />
                </Field>
              </div>
            )}

            <ErrorNote>{formError}</ErrorNote>

            <div className="mt-5 flex flex-wrap gap-2">
              {row.status === 'pending' && (
                <PrimaryBtn disabled={pending} onClick={doConfirm}>
                  <CheckCircle2 size={16} /> {confirmAssignment.isPending ? 'Tasdiqlanmoqda...' : 'Tasdiqlash'}
                </PrimaryBtn>
              )}
              {isStaff && row.status !== 'returned' && (
                <SecondaryBtn disabled={pending} onClick={doReturn}>
                  <RotateCcw size={16} /> Omborga qaytarish
                </SecondaryBtn>
              )}
              {isStaff && row.productId && (
                <SecondaryBtn onClick={() => navigate(`/products/${row.productId}`)}>
                  <Package size={15} /> Mahsulot
                </SecondaryBtn>
              )}
              {isStaff && row.employeeId && (
                <SecondaryBtn onClick={() => navigate(`/employees/${row.employeeId}`)}>
                  <UserRound size={15} /> Xodim
                </SecondaryBtn>
              )}
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-[15px] font-semibold text-ink">QR yorlig'i</h2>
          <p className="mt-1 text-xs text-muted">Skanerlanganda shu mahsulot va uning xonasi/xodimi chiqadi.</p>
          <div className="mt-4">
            <AssignmentQrLabel assignment={row} product={row.product} employee={row.employee} room={row.room} />
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  )
}
