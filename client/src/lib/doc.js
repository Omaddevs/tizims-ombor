import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx'
import { formatDate, formatSum } from './format'

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function headerRow(cells) {
  return new TableRow({
    children: cells.map(
      (text) =>
        new TableCell({
          shading: { fill: '1D4ED8' },
          children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'FFFFFF' })] })],
        }),
    ),
  })
}

function dataRow(cells) {
  return new TableRow({
    children: cells.map((text) => new TableCell({ children: [new Paragraph(String(text))] })),
  })
}

function table(head, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow(head), ...rows.map(dataRow)],
  })
}

export async function exportReportDoc({ range, totals, byProduct, byEmployee }, filename) {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: 'Ombor hisoboti', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: `${formatDate(range.from)} — ${formatDate(range.to)}`, spacing: { after: 200 } }),
          table(
            ['Ko\'rsatkich', 'Qiymat'],
            [
              ['Kirim (soni / miqdori / summasi)', `${totals.inCount} / ${totals.inQty} / ${formatSum(totals.inSum)}`],
              ['Chiqim (soni / miqdori / summasi)', `${totals.outCount} / ${totals.outQty} / ${formatSum(totals.outSum)}`],
            ],
          ),
          new Paragraph({ text: 'Mahsulotlar kesimida', heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }),
          table(
            ['Mahsulot', 'Kirim', 'Chiqim', 'Chiqim summasi'],
            byProduct.map((p) => [p.name, `${p.inQty} ${p.unit}`, `${p.outQty} ${p.unit}`, formatSum(p.outSum)]),
          ),
          new Paragraph({ text: 'Xodimlar kesimida', heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }),
          table(
            ['Xodim', 'Bo\'lim', 'Buyumlar', 'Miqdor', 'Summa'],
            byEmployee.map((e) => [e.fullName, e.department, e.items, e.outQty, formatSum(e.outSum)]),
          ),
        ],
      },
    ],
  })
  saveBlob(await Packer.toBlob(doc), filename)
}

export async function exportEmployeeDoc({ employee, assignments, transactions, totalOutSum }, filename) {
  const statusLabel = { active: 'Foydalanishda', pending: 'Tasdiq kutilmoqda', returned: 'Qaytarilgan' }
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: `Xodim hisoboti — ${employee.fullName}`, heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: `${employee.department} · ${employee.position}`, spacing: { after: 200 } }),
          new Paragraph({ text: 'Biriktirilgan buyumlar', heading: HeadingLevel.HEADING_2, spacing: { after: 100 } }),
          table(
            ['Buyum', 'Miqdor', 'Holat', 'Sana'],
            assignments.map((a) => [
              a.product?.name || '—',
              `${a.quantity} ${a.product?.unit || ''}`,
              statusLabel[a.status] || a.status,
              formatDate(a.assignedAt),
            ]),
          ),
          new Paragraph({ text: 'Kirim-chiqim tarixi', heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }),
          table(
            ['Sana', 'Tur', 'Mahsulot', 'Miqdor'],
            transactions.map((t) => [formatDate(t.createdAt), t.type === 'in' ? 'Kirim' : 'Chiqim', t.product?.name || '—', `${t.quantity} ${t.product?.unit || ''}`]),
          ),
          new Paragraph({ text: `Jami olingan buyumlar summasi: ${formatSum(totalOutSum)}`, spacing: { before: 300 } }),
        ],
      },
    ],
  })
  saveBlob(await Packer.toBlob(doc), filename)
}
