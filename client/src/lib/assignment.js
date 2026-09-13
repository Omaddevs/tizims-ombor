export function roomTitle(room) {
  if (!room) return ''
  if (room.name) return room.name
  return `${room.number}-xona`
}

export function assignmentTarget(row) {
  if (row?.room) {
    const floor = row.room.floor ? `${row.room.floor}-qavat` : ''
    return {
      kind: 'room',
      title: roomTitle(row.room),
      subtitle: [row.room.building, floor].filter(Boolean).join(' · ') || 'Xona',
    }
  }
  if (row?.employee) {
    return {
      kind: 'employee',
      title: row.employee.fullName,
      subtitle: [row.employee.position, row.employee.department].filter(Boolean).join(' · ') || 'Xodim',
    }
  }
  return { kind: null, title: '—', subtitle: '' }
}
