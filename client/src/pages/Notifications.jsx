import { Bell, CheckCheck } from 'lucide-react'
import { useMarkAllNotifsRead, useMarkNotifRead, useNotifications } from '../api/queries'
import { EmptyState, PageHeader, SecondaryBtn } from '../components/ui'
import { timeAgo } from '../lib/format'

export default function Notifications() {
  const { data: notifications, isLoading } = useNotifications()
  const markRead = useMarkNotifRead()
  const markAll = useMarkAllNotifsRead()
  const unread = (notifications || []).filter((n) => !n.read).length

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-6">
      <PageHeader
        title="Bildirishnomalar"
        crumbs={['Asosiy', 'Bildirishnomalar']}
        action={
          unread > 0 ? (
            <SecondaryBtn onClick={() => markAll.mutate()}>
              <CheckCheck size={15} /> Barchasini o'qilgan deb belgilash
            </SecondaryBtn>
          ) : null
        }
      />
      <p className="text-sm text-muted">{unread} o'qilmagan</p>

      {isLoading && <p className="py-10 text-center text-sm text-muted">Yuklanmoqda...</p>}

      {!isLoading && !notifications?.length && (
        <div className="card">
          <EmptyState icon={Bell} title="Bildirishnomalar yo'q" />
        </div>
      )}

      <div className="space-y-2">
        {(notifications || []).map((n) => (
          <button
            key={n.id}
            onClick={() => !n.read && markRead.mutate(n.id)}
            className={`card block w-full p-4 text-left transition ${n.read ? 'opacity-70' : 'ring-2 ring-brand-100'}`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{n.title}</p>
              <span className="shrink-0 text-xs text-muted">{timeAgo(n.createdAt)}</span>
            </div>
            <p className="mt-1 text-sm text-muted">{n.body}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
