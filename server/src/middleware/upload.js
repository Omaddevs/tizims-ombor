import multer from 'multer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { nanoid } from 'nanoid'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads')

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 10)
    cb(null, `${Date.now()}_${nanoid(8)}${ext}`)
  },
})

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const mime = file.mimetype || ''
    const name = file.originalname || ''
    const ok =
      /^(image\/|application\/pdf)/.test(mime) ||
      /excel|spreadsheetml|spreadsheet/.test(mime) ||
      /\.(pdf|png|jpe?g|gif|webp|xlsx|xls)$/i.test(name)
    cb(ok ? null : new Error('Faqat rasm, PDF yoki Excel fayl yuklash mumkin'), ok)
  },
})
