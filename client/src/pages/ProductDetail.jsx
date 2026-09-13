import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer, Trash2 } from 'lucide-react'
import { useCategories, useDeleteProduct, useProduct, useTransactions, useUpdateProduct } from '../api/queries'
import { Badge, DangerBtn, ErrorNote, Field, Modal, PageHeader, PrimaryBtn, SecondaryBtn, inputClass } from '../components/ui'
import { Select } from '../components/Select'
import { ProductBarcodeLabel } from '../components/QrLabel'
import { formatDate, formatSum } from '../lib/format'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: product, isLoading } = useProduct(id)
  const { data: categories } = useCategories()
  const { data: transactions } = useTransactions({ productId: id })
  const update = useUpdateProduct()
  const del = useDeleteProduct()
  const [editOpen, setEditOpen] = useState(false)
  const [labelOpen, setLabelOpen] = useState(false)
  const [error, setError] = useState('')

  if (isLoading || !product) return <p className="py-10 text-center text-sm text-muted">Yuklanmoqda...</p>

  const category = categories?.find((c) => c.id === product.categoryId)

  const remove = async () => {
    if (!confirm(`"${product.name}" mahsulotini o'chirmoqchimisiz?`)) return
    try {
      await del.mutateAsync(product.id)
      navigate('/products')
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader title={product.name} crumbs={['Asosiy', 'Mahsulotlar', product.name]} />
      <button onClick={() => navigate('/products')} className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-slate-600">
        <ArrowLeft size={16} /> Mahsulotlar
      </button>

      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {product.photoUrl ? (
              <img src={product.photoUrl} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-1 ring-slate-100" />
            ) : null}
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold">{product.name}</h1>
              <p className="mt-1 text-sm text-muted">{category?.name || 'Kategoriyasiz'} · shtrix-kod: <span className="font-mono">{product.barcode}</span></p>
            </div>
          </div>
          <Badge tone={product.quantity === 0 ? 'red' : product.quantity <= product.minStock ? 'yellow' : 'green'}>
            Qoldiq: {product.quantity} {product.unit}
          </Badge>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <InfoRow label="Narxi" value={formatSum(product.price)} />
          <InfoRow label="Minimal zaxira" value={`${product.minStock} ${product.unit}`} />
          <InfoRow label="Yetkazib beruvchi" value={product.supplier || '—'} />
        </div>

        <ErrorNote>{error}</ErrorNote>

        <div className="mt-5 flex flex-wrap gap-2">
          <SecondaryBtn onClick={() => setEditOpen(true)}>Tahrirlash</SecondaryBtn>
          <SecondaryBtn onClick={() => setLabelOpen(true)}>
            <Printer size={15} /> Shtrix-kod chop etish
          </SecondaryBtn>
          <DangerBtn onClick={remove} className="ml-auto">
            <Trash2 size={15} /> O'chirish
          </DangerBtn>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 p-4 font-bold">Harakatlar tarixi</div>
        <ul className="divide-y divide-slate-100">
          {(transactions || []).map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-semibold">{t.type === 'in' ? 'Kirim' : 'Chiqim'} · {t.quantity} {product.unit}</p>
                <p className="text-xs text-muted">
                  {formatDate(t.createdAt, true)} {t.employee ? `· ${t.employee.fullName}` : ''} {t.performedBy ? `· ${t.performedBy.name}` : ''}
                </p>
              </div>
            </li>
          ))}
          {!transactions?.length && <p className="py-8 text-center text-sm text-muted">Harakatlar yo'q</p>}
        </ul>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Mahsulotni tahrirlash">
        <EditForm product={product} categories={categories} onDone={() => setEditOpen(false)} />
      </Modal>

      <Modal open={labelOpen} onClose={() => setLabelOpen(false)} title="Shtrix-kod yorlig'i">
        <ProductBarcodeLabel product={product} />
      </Modal>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  )
}

function EditForm({ product, categories, onDone }) {
  const update = useUpdateProduct()
  const [form, setForm] = useState({
    name: product.name,
    categoryId: product.categoryId || '',
    unit: product.unit,
    minStock: product.minStock,
    price: product.price,
    supplier: product.supplier || '',
  })
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await update.mutateAsync({ id: product.id, ...form, minStock: Number(form.minStock), price: Number(form.price) })
      onDone()
    } catch (e2) {
      setError(e2.message)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3.5">
      <Field label="Nomi">
        <input className={inputClass} value={form.name} onChange={set('name')} required />
      </Field>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Kategoriya">
          <Select
            value={form.categoryId}
            onChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
            options={(categories || []).map((c) => ({ value: c.id, label: c.name }))}
          />
        </Field>
        <Field label="O'lchov birligi">
          <input className={inputClass} value={form.unit} onChange={set('unit')} required />
        </Field>
      </div>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Minimal zaxira">
          <input type="number" min="0" className={inputClass} value={form.minStock} onChange={set('minStock')} />
        </Field>
        <Field label="Narxi (so'm)">
          <input type="number" min="0" className={inputClass} value={form.price} onChange={set('price')} />
        </Field>
      </div>
      <Field label="Yetkazib beruvchi">
        <input className={inputClass} value={form.supplier} onChange={set('supplier')} />
      </Field>
      <ErrorNote>{error}</ErrorNote>
      <PrimaryBtn type="submit" disabled={update.isPending} className="w-full">
        {update.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
      </PrimaryBtn>
    </form>
  )
}
