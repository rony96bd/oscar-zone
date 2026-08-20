import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllPaymentMethods, updatePaymentMethod, createPaymentMethod } from '@/services/payments'
import { 
  CreditCard, ToggleLeft, ToggleRight, Edit2, X, Save, 
  Plus, Loader2, QrCode, Link as LinkIcon, Tag, User, 
  AlignLeft, ChevronUp, ChevronDown, Upload, ImageIcon, Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { GAME_ASSETS_BUCKET } from '@/lib/constants'
import type { PaymentMethod } from '@/types'
import { cn } from '@/lib/utils'

const EMPTY_METHOD: Partial<PaymentMethod> = {
  name: '',
  tag: '',
  account_name: '',
  payment_link: '',
  qr_code_url: '',
  instructions: '',
  minimum_amount: 10,
  maximum_amount: 1000,
  agent_commission_rate: 0,
  is_active: true,
  sort_order: 99,
}

/* ─────── QR Upload Component ─────── */
function QrUploader({
  currentUrl,
  onChange,
}: {
  currentUrl: string
  onChange: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Extract storage path from public URL
  const getPathFromUrl = (url: string): string | null => {
    try {
      const marker = `/object/public/${GAME_ASSETS_BUCKET}/`
      const idx = url.indexOf(marker)
      if (idx === -1) return null
      return decodeURIComponent(url.slice(idx + marker.length).split('?')[0])
    } catch {
      return null
    }
  }

  const deleteFromStorage = async (url: string) => {
    const path = getPathFromUrl(url)
    if (!path) return // External URL — nothing to delete
    try {
      await supabase.storage.from(GAME_ASSETS_BUCKET).remove([path])
    } catch (err) {
      console.warn('Could not delete old QR from storage:', err)
    }
  }

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return toast.error('Please select an image file')
    if (file.size > 5 * 1024 * 1024) return toast.error('File must be under 5MB')

    setUploading(true)
    try {
      // Delete old QR from storage first (if it was uploaded here)
      if (currentUrl) await deleteFromStorage(currentUrl)

      const ext = file.name.split('.').pop() || 'png'
      const path = `qr-codes/${Date.now()}.${ext}`
      
      const { error: uploadError } = await supabase.storage
        .from(GAME_ASSETS_BUCKET)
        .upload(path, file, { upsert: true, cacheControl: '86400' })
      
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from(GAME_ASSETS_BUCKET)
        .getPublicUrl(path)

      onChange(publicUrl)
      toast.success('QR code uploaded!')
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <label className="text-xs text-muted-foreground block">QR Code Image</label>
      
      {/* Preview */}
      {currentUrl && (
        <div className="flex items-center gap-3">
          <div className="bg-white p-2 rounded-lg flex-shrink-0">
            <img
              src={currentUrl}
              alt="QR Preview"
              className="h-24 w-24 object-contain"
              onError={(e) => (e.currentTarget.parentElement!.style.display = 'none')}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">Current QR code</p>
            <button
              type="button"
              onClick={async () => {
                if (currentUrl) await deleteFromStorage(currentUrl)
                onChange('')
                toast.success('QR code removed')
              }}
              className="inline-flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors"
            >
              <Trash2 className="h-3 w-3" /> Remove
            </button>
          </div>
        </div>
      )}

      {/* Upload area */}
      <div
        className={cn(
          'upload-zone relative cursor-pointer transition-all',
          uploading && 'opacity-50 pointer-events-none'
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over') }}
        onDragLeave={(e) => e.currentTarget.classList.remove('drag-over')}
        onDrop={(e) => {
          e.preventDefault()
          e.currentTarget.classList.remove('drag-over')
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {currentUrl ? 'Replace QR Code' : 'Upload QR Code'}
            </p>
            <p className="text-xs text-muted-foreground">Drag & drop or click — PNG, JPG up to 5MB</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────── Payment Method Form ─────── */
function PaymentMethodForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: Partial<PaymentMethod>
  onSave: (data: Partial<PaymentMethod>) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const [form, setForm] = useState<Partial<PaymentMethod>>(initial)
  const set = (field: keyof PaymentMethod, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Method Name *</label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input className="game-input pl-9" placeholder="e.g. Chime" value={form.name || ''} onChange={e => set('name', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Account Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input className="game-input pl-9" placeholder="e.g. Oscar Zone" value={form.account_name || ''} onChange={e => set('account_name', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Tag / $Cashtag</label>
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input className="game-input pl-9" placeholder="e.g. $OscarZone" value={form.tag || ''} onChange={e => set('tag', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Payment Link (optional)</label>
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input className="game-input pl-9" placeholder="https://..." value={form.payment_link || ''} onChange={e => set('payment_link', e.target.value)} />
          </div>
        </div>
      </div>

      {/* QR Code Upload */}
      <QrUploader
        currentUrl={form.qr_code_url || ''}
        onChange={(url) => set('qr_code_url', url)}
      />

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Payment Instructions</label>
        <div className="relative">
          <AlignLeft className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <textarea
            rows={4}
            className="game-input pl-9 resize-none"
            placeholder={"1. Open the app\n2. Search for our tag\n3. Send exact amount\n4. Screenshot confirmation"}
            value={form.instructions || ''}
            onChange={e => set('instructions', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Min Amount ($)</label>
          <input type="number" className="game-input" value={form.minimum_amount ?? 10} onChange={e => set('minimum_amount', Number(e.target.value))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Max Amount ($)</label>
          <input type="number" className="game-input" value={form.maximum_amount ?? 1000} onChange={e => set('maximum_amount', Number(e.target.value))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Agent Cut (%)</label>
          <input type="number" className="game-input" value={form.agent_commission_rate ?? 0} onChange={e => set('agent_commission_rate', Number(e.target.value))} />
        </div>
      </div>

      <div className="flex gap-3 pt-2 border-t border-border">
        <button
          type="button"
          onClick={() => onSave(form)}
          disabled={isSaving || !form.name}
          className="btn-neon px-6 py-2 text-sm flex-1"
        >
          {isSaving
            ? <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            : <><Save className="h-4 w-4" /> Save Changes</>
          }
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost-neon px-6 py-2 text-sm">
          <X className="h-4 w-4" /> Cancel
        </button>
      </div>
    </div>
  )
}

/* ─────── Main Page ─────── */
export default function AdminPaymentMethodsPage() {
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addingNew, setAddingNew] = useState(false)

  const { data: methods = [], isLoading } = useQuery({
    queryKey: ['admin-payment-methods'],
    queryFn: fetchAllPaymentMethods,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PaymentMethod> }) =>
      updatePaymentMethod(id, updates),
    onSuccess: () => {
      toast.success('Payment method updated!')
      qc.invalidateQueries({ queryKey: ['admin-payment-methods'] })
      setEditingId(null)
    },
    onError: () => toast.error('Failed to update'),
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<PaymentMethod>) => createPaymentMethod(data),
    onSuccess: () => {
      toast.success('Payment method created!')
      qc.invalidateQueries({ queryKey: ['admin-payment-methods'] })
      setAddingNew(false)
    },
    onError: () => toast.error('Failed to create'),
  })

  const toggleActive = (m: PaymentMethod) =>
    updateMutation.mutate({ id: m.id, updates: { is_active: !m.is_active } })

  const reorder = (m: PaymentMethod, dir: 'up' | 'down') =>
    updateMutation.mutate({ id: m.id, updates: { sort_order: (m.sort_order ?? 0) + (dir === 'up' ? -1 : 1) } })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-gaming font-bold text-white">Payment Methods</h1>
          <p className="text-sm text-muted-foreground">Manage QR codes, tags, and payment links shown to customers</p>
        </div>
        <button
          onClick={() => { setAddingNew(true); setEditingId(null) }}
          className="btn-neon px-4 py-2 text-sm"
        >
          <Plus className="h-4 w-4" /> Add Method
        </button>
      </div>

      {/* Add New Form */}
      {addingNew && (
        <div className="glass-card p-6 border-2 border-primary/30">
          <h3 className="font-bold text-white mb-5 flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" /> New Payment Method
          </h3>
          <PaymentMethodForm
            initial={EMPTY_METHOD}
            onSave={(data) => createMutation.mutate(data)}
            onCancel={() => setAddingNew(false)}
            isSaving={createMutation.isPending}
          />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 skeleton rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {(methods as PaymentMethod[]).map((m) => (
            <div
              key={m.id}
              className={cn('glass-card overflow-hidden transition-all', !m.is_active && 'opacity-60')}
            >
              {/* Header */}
              <div className="p-5 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 font-bold text-primary text-lg flex-shrink-0">
                  {m.name.substring(0, 2)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-white">{m.name}</p>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      m.is_active ? 'bg-neon-green/15 text-neon-green' : 'bg-muted text-muted-foreground'
                    )}>
                      {m.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {m.tag && <p className="text-sm text-primary font-mono mt-0.5">{m.tag}</p>}
                  {m.account_name && <p className="text-xs text-muted-foreground">{m.account_name}</p>}
                </div>

                {/* QR thumb */}
                {m.qr_code_url ? (
                  <div className="bg-white p-1.5 rounded-lg flex-shrink-0 hidden sm:block">
                    <img src={m.qr_code_url} alt="QR" className="h-12 w-12 object-contain" />
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded-lg border border-dashed border-border flex items-center justify-center flex-shrink-0 hidden sm:flex">
                    <QrCode className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                )}

                {/* Controls */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex flex-col gap-1">
                    <button onClick={() => reorder(m, 'up')} className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors">
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button onClick={() => reorder(m, 'down')} className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors">
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                  <button
                    onClick={() => { setEditingId(editingId === m.id ? null : m.id); setAddingNew(false) }}
                    className={cn(
                      'h-9 w-9 flex items-center justify-center rounded-lg border transition-all',
                      editingId === m.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:text-foreground hover:bg-white/10'
                    )}
                  >
                    {editingId === m.id ? <X className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                  </button>
                  <button onClick={() => toggleActive(m)} className="transition-all">
                    {m.is_active
                      ? <ToggleRight className="h-8 w-8 text-neon-green" />
                      : <ToggleLeft className="h-8 w-8 text-muted-foreground" />
                    }
                  </button>
                </div>
              </div>

              {/* Expandable Edit Form */}
              {editingId === m.id && (
                <div className="border-t border-border p-6 bg-card/50">
                  <PaymentMethodForm
                    initial={m}
                    onSave={(data) => updateMutation.mutate({ id: m.id, updates: data })}
                    onCancel={() => setEditingId(null)}
                    isSaving={updateMutation.isPending}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
