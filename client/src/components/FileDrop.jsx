import { useRef, useState } from 'react'
import { CloudUpload, FileText, Loader2, X } from 'lucide-react'
import { useUploadDocument } from '../api/queries'
import { cn } from './ui'

const ACCEPT =
  'image/*,application/pdf,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function isAllowed(file) {
  const mime = file.type || ''
  const name = file.name || ''
  if (/^image\//.test(mime) || mime === 'application/pdf') return true
  if (/excel|spreadsheetml|spreadsheet/.test(mime)) return true
  return /\.(pdf|png|jpe?g|gif|webp|xlsx|xls)$/i.test(name)
}

export function FileDrop({
  value,
  onChange,
  title = 'Faylni bu yerga tashlang yoki tanlang',
  hint = 'Rasm, PDF, Excel (maks. 10 MB)',
}) {
  const inputRef = useRef(null)
  const [fileName, setFileName] = useState('')
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const upload = useUploadDocument()

  const handleFile = async (file) => {
    if (!file) return
    setError('')
    if (file.size > 10 * 1024 * 1024) {
      setError('Fayl hajmi 10 MB dan oshmasligi kerak')
      return
    }
    if (!isAllowed(file)) {
      setError('Faqat rasm, PDF yoki Excel yuklash mumkin')
      return
    }
    setFileName(file.name)
    try {
      const res = await upload.mutateAsync(file)
      onChange(res.url, { name: res.name || file.name, size: res.size || file.size })
    } catch {
      setFileName('')
      setError("Faylni yuklab bo'lmadi")
    }
  }

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm">
        <span className="flex min-w-0 items-center gap-2 truncate text-slate-700">
          <FileText size={16} className="shrink-0 text-brand-700" />
          <span className="truncate">{fileName || 'Fayl yuklandi'}</span>
        </span>
        <button
          type="button"
          onClick={() => {
            onChange(null)
            setFileName('')
            setError('')
          }}
          className="shrink-0 text-slate-400 hover:text-rose-600"
        >
          <X size={16} />
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={upload.isPending}
        onDragEnter={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFile(e.dataTransfer.files?.[0])
        }}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-3.5 py-6 text-center transition',
          dragging
            ? 'border-brand-400 bg-brand-50 text-brand-700'
            : 'border-slate-200 bg-slate-50/40 text-slate-500 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700',
        )}
      >
        {upload.isPending ? (
          <Loader2 size={22} className="animate-spin text-brand-600" />
        ) : (
          <CloudUpload size={22} className={dragging ? 'text-brand-600' : 'text-slate-400'} />
        )}
        <span className="text-sm font-semibold text-slate-600">
          {upload.isPending ? 'Yuklanmoqda...' : title}
        </span>
        <span className="text-[11px] text-muted">{hint}</span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </button>
      {error ? <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  )
}
