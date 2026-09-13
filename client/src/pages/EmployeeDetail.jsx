import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileSpreadsheet, FileText, FileType2, Link2 } from 'lucide-react'
import { useEmployeeHistory, useEmployeeReport, useOrgUsers, useReturnAssignment, useUpdateEmployee } from '../api/queries'
import { useCurrentUser } from '../store/useAuthStore'
import { Avatar, Badge, PageHeader, SecondaryBtn } from '../components/ui'
import { Select } from '../components/Select'
import { employeeStatus, formatDate, formatSum } from '../lib/format'
import { exportEmployeePdf } from '../lib/pdf'
import { exportEmployeeDoc } from '../lib/doc'
import { exportRowsToExcel } from '../lib/excel'

const STATUS_LABEL = { active: 'Foydalanishda', pending: 'Tasdiq kutilmoqda', returned: 'Qaytarilgan' }
const STATUS_TONE = { active: 'green', pending: 'yellow', returned: 'slate' }

export default function EmployeeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const me = useCurrentUser()
  const { data, isLoading } = useEmployeeHistory(id)
  const { data: report } = useEmployeeReport(id)
  const { data: orgUsers } = useOrgUsers()
  const returnAssignment = useReturnAssignment()
  const updateEmployee = useUpdateEmployee()

  if (isLoading || !data) return <p className="py-10 text-center text-sm text-muted">Yuklanmoqda...</p>
  const { employee, assignments, transactions } = data

  const exportExcel = () => {
    exportRowsToExcel(
      transactions.map((t) => ({
        Sana: formatDate(t.createdAt, true),
        Tur: t.type === 'in' ? 'Kirim' : 'Chiqim',
        Mahsulot: t.product?.name || '—',
        Miqdor: t.quantity,
        'O\'lchov': t.product?.unit || '',
      })),
      'Tarix',
      `${employee.fullName}-hisobot.xlsx`,
    )
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader title={employee.fullName} crumbs={['Asosiy', 'Xodimlar', employee.fullName]} />
      <button onClick={() => navigate('/employees')} className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-slate-600">
        <ArrowLeft size={16} /> Xodimlar
      </button>

      <div className="card p-5">
        <div className="flex flex-wrap items-start gap-4">
          {employee.photoUrl ? (
            <img src={employee.photoUrl} alt="" className="h-16 w-16 rounded-full object-cover ring-1 ring-slate-100" />
          ) : (
            <Avatar name={employee.fullName} size="lg" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold">{employee.fullName}</h1>
              <Badge tone={employeeStatus(employee).tone}>{employeeStatus(employee).label}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted">
              {employee.department} · {employee.position || '—'} · {employee.phone || '—'}
            </p>
            <p className="mt-1 text-xs text-muted">
              Badge kodi: <span className="font-mono">{employee.badgeCode}</span>
              {' · '}
              Kirgan sana: {formatDate(employee.hiredAt || employee.createdAt)}
            </p>
          </div>
        </div>

        {me?.role === 'admin' && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5">
            <Link2 size={15} className="shrink-0 text-slate-400" />
            {employee.userId ? (
              <p className="text-sm">
                Tizim hisobiga bog'langan: <b>{orgUsers?.find((u) => u.id === employee.userId)?.name || '...'}</b>
              </p>
            ) : (
              <>
                <span className="text-sm text-muted">Tizim hisobiga bog'lash (o'zi tasdiqlashi uchun):</span>
                <Select
                  value=""
                  onChange={(v) => updateEmployee.mutate({ id: employee.id, userId: v })}
                  placeholder="Hisob tanlang"
                  options={(orgUsers || []).filter((u) => u.role === 'employee').map((u) => ({ value: u.id, label: u.name }))}
                />
              </>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <SecondaryBtn onClick={() => report && exportEmployeePdf(report, `${employee.fullName}-hisobot.pdf`)}>
            <FileText size={15} /> PDF
          </SecondaryBtn>
          <SecondaryBtn onClick={exportExcel}>
            <FileSpreadsheet size={15} /> Excel
          </SecondaryBtn>
          <SecondaryBtn onClick={() => report && exportEmployeeDoc(report, `${employee.fullName}-hisobot.docx`)}>
            <FileType2 size={15} /> DOC
          </SecondaryBtn>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 p-4 font-bold">Biriktirilgan buyumlar</div>
        <ul className="divide-y divide-slate-100">
          {assignments.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{a.product?.name}</p>
                <p className="text-xs text-muted">
                  {a.assetTag} · {a.quantity} {a.product?.unit} · {formatDate(a.assignedAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                {a.status !== 'returned' && (
                  <button
                    onClick={() => returnAssignment.mutate(a.id)}
                    disabled={returnAssignment.isPending}
                    className="text-xs font-semibold text-brand-700 hover:underline"
                  >
                    Qaytarish
                  </button>
                )}
              </div>
            </li>
          ))}
          {!assignments.length && <p className="py-8 text-center text-sm text-muted">Biriktirilgan buyum yo'q</p>}
        </ul>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 p-4 font-bold">Kirim-chiqim tarixi</div>
        <ul className="divide-y divide-slate-100">
          {transactions.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-semibold">
                  {t.type === 'in' ? 'Kirim' : 'Chiqim'} · {t.product?.name}
                </p>
                <p className="text-xs text-muted">{formatDate(t.createdAt, true)}</p>
              </div>
              <span className="text-sm font-semibold">
                {t.quantity} {t.product?.unit}
              </span>
            </li>
          ))}
          {!transactions.length && <p className="py-8 text-center text-sm text-muted">Harakatlar yo'q</p>}
        </ul>
        {report && (
          <div className="border-t border-slate-100 px-4 py-3 text-right text-sm font-bold">
            Jami olingan summasi: {formatSum(report.totalOutSum)}
          </div>
        )}
      </div>
    </div>
  )
}
