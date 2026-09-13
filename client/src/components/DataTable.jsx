import { EmptyState } from './ui'

export function DataTable({ columns, rows, keyField = 'id', empty, emptyHint, onRowClick, loading }) {
  if (loading) {
    return <div className="card p-10 text-center text-sm text-muted">Yuklanmoqda...</div>
  }
  if (!rows?.length) {
    return (
      <div className="card">
        <EmptyState title={empty || 'Ma\'lumot topilmadi'} hint={emptyHint} />
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {columns.map((c) => (
                <th key={c.key} className="px-5 py-3.5 font-semibold">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((row) => (
              <tr
                key={row[keyField]}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? 'cursor-pointer transition hover:bg-slate-50/80' : ''}
              >
                {columns.map((c) => (
                  <td key={c.key} className="px-5 py-3.5 align-middle">
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-slate-50 lg:hidden">
        {rows.map((row) => (
          <li
            key={row[keyField]}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={onRowClick ? 'cursor-pointer p-4 transition active:bg-slate-50' : 'p-4'}
          >
            <div className="space-y-1.5">
              {columns.map((c) => (
                <div key={c.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-xs font-medium text-slate-400">{c.label}</span>
                  <span className="min-w-0 truncate text-right font-medium">{c.render ? c.render(row) : row[c.key]}</span>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
