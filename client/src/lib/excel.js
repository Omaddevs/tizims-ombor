import * as XLSX from 'xlsx'

export function exportRowsToExcel(rows, sheetName, filename) {
  const sheet = XLSX.utils.json_to_sheet(rows)
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, sheetName.slice(0, 31))
  XLSX.writeFile(book, filename)
}

export function exportReportExcel({ range, totals, byProduct, byEmployee }, filename) {
  const book = XLSX.utils.book_new()

  const summaryRows = [
    { Ko_rsatkich: 'Davr boshlanishi', Qiymat: range.from },
    { Ko_rsatkich: 'Davr oxiri', Qiymat: range.to },
    { Ko_rsatkich: 'Kirim soni', Qiymat: totals.inCount },
    { Ko_rsatkich: 'Kirim miqdori', Qiymat: totals.inQty },
    { Ko_rsatkich: 'Kirim summasi', Qiymat: totals.inSum },
    { Ko_rsatkich: 'Chiqim soni', Qiymat: totals.outCount },
    { Ko_rsatkich: 'Chiqim miqdori', Qiymat: totals.outQty },
    { Ko_rsatkich: 'Chiqim summasi', Qiymat: totals.outSum },
  ]
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(summaryRows), 'Umumiy')

  const productRows = byProduct.map((p) => ({
    Mahsulot: p.name,
    'O\'lchov': p.unit,
    'Kirim miqdori': p.inQty,
    'Kirim summasi': p.inSum,
    'Chiqim miqdori': p.outQty,
    'Chiqim summasi': p.outSum,
  }))
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(productRows), 'Mahsulotlar')

  const employeeRows = byEmployee.map((e) => ({
    'F.I.Sh.': e.fullName,
    Bo_lim: e.department,
    'Olgan buyumlar soni': e.items,
    Miqdor: e.outQty,
    Summa: e.outSum,
  }))
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(employeeRows), 'Xodimlar')

  XLSX.writeFile(book, filename)
}
