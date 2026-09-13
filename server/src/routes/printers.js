import { Router } from 'express'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const execFileAsync = promisify(execFile)
const router = Router()
router.use(requireAuth)

const STATUS = {
  1: 'Boshqa',
  2: "Noma'lum",
  3: 'Tayyor',
  4: 'Chop etilmoqda',
  5: 'Qizimoqda',
  6: 'To\'xtatilgan',
  7: 'Offline',
}

function mapPrinter(row) {
  const statusCode = Number(row.PrinterStatus) || 0
  const offline = Boolean(row.WorkOffline)
  return {
    name: String(row.Name || '').trim(),
    isDefault: Boolean(row.Default),
    offline,
    statusCode,
    status: offline ? 'Offline' : STATUS[statusCode] || 'Tayyor',
  }
}

async function listWindowsPrinters() {
  const ps = [
    'Get-CimInstance -ClassName Win32_Printer |',
    'Select-Object Name, Default, PrinterStatus, WorkOffline |',
    'ConvertTo-Json -Compress',
  ].join(' ')
  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', ps],
    { timeout: 20000, windowsHide: true },
  )
  const text = String(stdout || '').trim()
  if (!text) return []
  const parsed = JSON.parse(text)
  const rows = Array.isArray(parsed) ? parsed : [parsed]
  return rows.map(mapPrinter).filter((p) => p.name)
}

router.get('/', asyncHandler(async (_req, res) => {
  if (process.platform !== 'win32') {
    return res.json({ printers: [], note: 'Printerlar ro\'yxati Windowsda mavjud' })
  }
  try {
    const printers = await listWindowsPrinters()
    res.json({ printers })
  } catch (err) {
    res.json({ printers: [], error: err.message || 'Printerlarni o\'qib bo\'lmadi' })
  }
}))

router.post('/print', requireRole('admin', 'manager', 'employee'), asyncHandler(async (req, res) => {
  const printer = String(req.body?.printer || '').trim()
  const image = String(req.body?.image || '')
  if (!printer) return res.status(400).json({ error: 'Printer tanlanishi shart' })
  const match = image.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i)
  if (!match) return res.status(400).json({ error: 'Yorliq rasmi yaroqsiz' })

  if (process.platform !== 'win32') {
    return res.status(501).json({ error: 'To\'g\'ridan-to\'g\'ri chop etish faqat Windowsda ishlaydi. Brauzer orqali chop eting.' })
  }

  const ext = match[1].toLowerCase() === 'png' ? 'png' : 'jpg'
  const filePath = path.join(os.tmpdir(), `tizims-label-${Date.now()}.${ext}`)
  await fs.writeFile(filePath, Buffer.from(match[2], 'base64'))

  try {
    await execFileAsync('mspaint.exe', ['/pt', filePath, printer], {
      timeout: 45000,
      windowsHide: true,
    })
    res.json({ ok: true })
  } catch (err) {
    throw Object.assign(new Error(err.message || 'Printerga yuborib bo\'lmadi'), { status: 500 })
  } finally {
    fs.unlink(filePath).catch(() => {})
  }
}))

export default router
