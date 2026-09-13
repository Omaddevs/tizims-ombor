import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate, formatSum } from './format'

function baseDoc(title, subtitle) {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text(title, 14, 18)
  if (subtitle) {
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(subtitle, 14, 25)
  }
  return doc
}

export function exportTablePdf({ title, subtitle, head, rows, filename }) {
  const doc = baseDoc(title, subtitle)
  autoTable(doc, {
    startY: subtitle ? 30 : 24,
    head: [head],
    body: rows,
    headStyles: { fillColor: [29, 78, 216] },
    styles: { fontSize: 9, cellPadding: 3 },
  })
  doc.save(filename)
}

export function exportReportPdf({ range, totals, byProduct, byEmployee }, filename) {
  const doc = baseDoc('Ombor hisoboti', `${formatDate(range.from)} — ${formatDate(range.to)}`)

  autoTable(doc, {
    startY: 30,
    head: [['Ko\'rsatkich', 'Qiymat']],
    body: [
      ['Kirim (soni / miqdori / summasi)', `${totals.inCount} / ${totals.inQty} / ${formatSum(totals.inSum)}`],
      ['Chiqim (soni / miqdori / summasi)', `${totals.outCount} / ${totals.outQty} / ${formatSum(totals.outSum)}`],
    ],
    headStyles: { fillColor: [29, 78, 216] },
    styles: { fontSize: 10 },
  })

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    head: [['Mahsulot', 'Kirim', 'Chiqim', 'Chiqim summasi']],
    body: byProduct.map((p) => [p.name, `${p.inQty} ${p.unit}`, `${p.outQty} ${p.unit}`, formatSum(p.outSum)]),
    headStyles: { fillColor: [29, 78, 216] },
    styles: { fontSize: 9 },
  })

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    head: [['Xodim', 'Bo\'lim', 'Buyumlar', 'Miqdor', 'Summa']],
    body: byEmployee.map((e) => [e.fullName, e.department, e.items, e.outQty, formatSum(e.outSum)]),
    headStyles: { fillColor: [29, 78, 216] },
    styles: { fontSize: 9 },
  })

  doc.save(filename)
}

export function exportEmployeePdf({ employee, assignments, transactions, totalOutSum }, filename) {
  const doc = baseDoc(`Xodim hisoboti — ${employee.fullName}`, `${employee.department} · ${employee.position}`)

  autoTable(doc, {
    startY: 30,
    head: [['Biriktirilgan buyum', 'Miqdor', 'Holat', 'Sana']],
    body: assignments.map((a) => [
      a.product?.name || '—',
      `${a.quantity} ${a.product?.unit || ''}`,
      a.status === 'active' ? 'Foydalanishda' : a.status === 'pending' ? 'Tasdiq kutilmoqda' : 'Qaytarilgan',
      formatDate(a.assignedAt),
    ]),
    headStyles: { fillColor: [29, 78, 216] },
    styles: { fontSize: 9 },
  })

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    head: [['Sana', 'Tur', 'Mahsulot', 'Miqdor']],
    body: transactions.map((t) => [
      formatDate(t.createdAt),
      t.type === 'in' ? 'Kirim' : 'Chiqim',
      t.product?.name || '—',
      `${t.quantity} ${t.product?.unit || ''}`,
    ]),
    headStyles: { fillColor: [29, 78, 216] },
    styles: { fontSize: 9 },
  })

  doc.setFontSize(11)
  doc.text(`Jami olingan buyumlar summasi: ${formatSum(totalOutSum)}`, 14, doc.lastAutoTable.finalY + 12)

  doc.save(filename)
}
