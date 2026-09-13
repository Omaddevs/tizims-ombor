import { customAlphabet, nanoid } from 'nanoid'

const digits = customAlphabet('0123456789', 1)
const alnum = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1)

export function uid(prefix = 'id') {
  return `${prefix}_${nanoid(12)}`
}

// Internal Code128-friendly numeric barcode for products, e.g. 2894051726
export function generateProductBarcode() {
  let code = '28'
  for (let i = 0; i < 8; i++) code += digits()
  return code
}

// Human-typeable badge code for employees, e.g. EMP-7F3K9Q
export function generateBadgeCode() {
  let code = ''
  for (let i = 0; i < 6; i++) code += alnum()
  return `EMP-${code}`
}

// Opaque, hard-to-guess token embedded in a printed assignment QR label
export function generateQrToken() {
  return `AST-${nanoid(16)}`
}

export function generateAssetTag(seq) {
  return `INV-${String(seq).padStart(5, '0')}`
}
