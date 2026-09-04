import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllPaymentMethods, updatePaymentMethod, createPaymentMethod } from '@/services/payments'
import { 
  CreditCard, ToggleLeft, ToggleRight, Edit2, X, Save, 
  Plus, Loader2, QrCode, Link as LinkIcon, Tag, User, 
  AlignLeft, Upload, Trash2, GripVertical
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { GAME_ASSETS_BUCKET } from '@/lib/constants'
import type { PaymentMethod } from '@/types'
import { cn } from '@/lib/utils'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const EMPTY_METHOD: Partial<PaymentMethod> = {
  name: '',
  tag: '',
  account_name: '',
  payment_link: '',
  logo_url: '',
  qr_code_url: '',
  instructions: '',
  minimum_amount: 10,
  maximum_amount: 1000,
  agent_commission_rate: 0,
  is_active: true,
  is_agent: false,
  sort_order: 99,
}

/* ─────── Image Upload Component (reusable for QR and Logo) ─────── */
function ImageUploader({
  currentUrl,
  onChange,
  label,
  previewClass = 'h-24 w-24',
  path,
}: {
  currentUrl: string
  onChange: (url: string) => void
  label: string
  previewClass?: string
  path: string
}) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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
    const p = getPathFromUrl(url)
    if (!p) return
    try {
      await supabase.storage.from(GAME_ASSETS_BUCKET).remove([p])
    } catch (err) {
      console.warn('Could not delete old image from storage:', err)
    }
  }

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return toast.error('Please select an image file')
    if (file.size > 5 * 1024 * 1024) return toast.error('File must be under 5MB')

    setUploading(true)
    try {
      if (currentUrl) await deleteFromStorage(currentUrl)

      const ext = file.name.split('.').pop() || 'png'
      const filePath = `${path}/${Date.now()}.${ext}`
      
      const { error: uploadError } = await supabase.storage
        .from(GAME_ASSETS_BUCKET)
        .upload(filePath, file, { upsert: true, cacheControl: '86400' })
      
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from(GAME_ASSETS_BUCKET)
        .getPublicUrl(filePath)

      onChange(publicUrl)
      toast.success(`${label} uploaded!`)
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <label className="text-xs text-muted-foreground block">{label}</label>
      
      {currentUrl && (
        <div className="flex items-center gap-3">
          <div className="bg-white/10 border border-white/10 p-2 rounded-lg flex-shrink-0">
            <img
              src={currentUrl}
              alt={label}
              className={cn(previewClass, 'object-contain')}
              onError={(e) => (e.currentTarget.parentElement!.style.display = 'none')}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">Current {label.toLowerCase()}</p>
            <button
              type="button"
              onClick={async () => {
                if (currentUrl) await deleteFromStorage(currentUrl)
                onChange('')
                toast.success(`${label} removed`)
              }}
              className="inline-flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors"
            >
              <Trash2 className="h-3 w-3" /> Remove
            </button>
          </div>
        </div>
      )}

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
              {currentUrl ? `Replace ${label}` : `Upload ${label}`}
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

      {/* Logo + QR Code side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <ImageUploader
          label="Payment Method Logo"
          currentUrl={form.logo_url || ''}
          onChange={(url) => set('logo_url', url)}
          previewClass="h-12 w-24"
          path="payment-logos"
        />
        <ImageUploader
          label="QR Code Image"
          currentUrl={form.qr_code_url || ''}
          onChange={(url) => set('qr_code_url', url)}
          previewClass="h-24 w-24"
          path="qr-codes"
        />
      </div>

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

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => set('is_agent', !form.is_agent)}
          className="flex items-center gap-2 text-sm text-white"
        >
          {form.is_agent
            ? <ToggleRight className="h-6 w-6 text-neon-gold" />
            : <ToggleLeft className="h-6 w-6 text-muted-foreground" />
          }
          Is Agent Method? (Requires screenshot, optional tag)
        </button>
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

/* ─────── Sortable Payment Method Card ─────── */
function PaymentMethodCard({
  m,
  editingId,
  setEditingId,
  setAddingNew,
  toggleActive,
  updateMutation,
}: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: m.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('glass-card overflow-hidden transition-all', !m.is_active && 'opacity-60', isDragging && 'shadow-2xl ring-2 ring-primary/50')}
    >
      {/* Header */}
      <div className="p-5 flex items-center gap-4">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="h-8 w-6 flex items-center justify-center text-muted-foreground hover:text-white cursor-grab active:cursor-grabbing transition-colors flex-shrink-0 touch-none"
          title="Drag to reorder"
        >
          <GripVertical className="h-5 w-5" />
        </button>

        {/* Logo or initials */}
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 border border-white/10 flex-shrink-0 overflow-hidden">
          {m.logo_url ? (
            <img src={m.logo_url} alt={m.name} className="h-10 w-10 object-contain" />
          ) : (
            <span className="font-bold text-primary text-lg">{m.name.substring(0, 2).toUpperCase()}</span>
          )}
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
            {m.is_agent && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-neon-gold/15 text-neon-gold">
                Agent Method
              </span>
            )}
          </div>
          {m.tag && <p className="text-sm text-primary font-mono mt-0.5">{m.tag}</p>}
          {m.account_name && <p className="text-xs text-muted-foreground">{m.account_name}</p>}
          <p className="text-xs text-muted-foreground/50 mt-0.5">Order: {m.sort_order}</p>
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
  )
}

/* ─────── Main Page ─────── */
export default function AdminPaymentMethodsPage() {
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active')
  const [localOrder, setLocalOrder] = useState<PaymentMethod[]>([])

  const { data: methods = [], isLoading } = useQuery({
    queryKey: ['admin-payment-methods'],
    queryFn: fetchAllPaymentMethods,
    select: (data) => [...data].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
  })

  // Sync localOrder when server data changes
  const activeMethods = (methods as PaymentMethod[]).filter(m => m.is_active)
  const inactiveMethods = (methods as PaymentMethod[]).filter(m => !m.is_active)
  const displayedMethods = activeTab === 'active' ? activeMethods : inactiveMethods

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PaymentMethod> }) =>
      updatePaymentMethod(id, updates),
    onSuccess: () => {
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const currentList = [...displayedMethods]
    const oldIndex = currentList.findIndex(m => m.id === active.id)
    const newIndex = currentList.findIndex(m => m.id === over.id)
    const reordered = arrayMove(currentList, oldIndex, newIndex)

    // Optimistically update all sort_orders for items in this tab
    // Save all changed items to DB
    const updates = reordered.map((m, idx) => ({ id: m.id, sort_order: idx + 1 }))
    
    // Fire all updates in parallel (fire and forget)
    toast.promise(
      Promise.all(updates.map(u => updatePaymentMethod(u.id, { sort_order: u.sort_order }))),
      {
        loading: 'Saving order...',
        success: () => {
          qc.invalidateQueries({ queryKey: ['admin-payment-methods'] })
          return 'Order saved!'
        },
        error: 'Failed to save order',
      }
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-gaming font-bold text-white">Payment Methods</h1>
          <p className="text-sm text-muted-foreground">Manage QR codes, logos, tags, and payment links shown to customers</p>
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

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-black/30 rounded-xl border border-white/5 w-fit">
        <button
          onClick={() => setActiveTab('active')}
          className={cn(
            'px-5 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2',
            activeTab === 'active'
              ? 'bg-neon-green/20 text-neon-green border border-neon-green/30'
              : 'text-muted-foreground hover:text-white'
          )}
        >
          Active
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full font-bold',
            activeTab === 'active' ? 'bg-neon-green/20 text-neon-green' : 'bg-white/10 text-muted-foreground'
          )}>
            {activeMethods.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('inactive')}
          className={cn(
            'px-5 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2',
            activeTab === 'inactive'
              ? 'bg-white/10 text-white border border-white/20'
              : 'text-muted-foreground hover:text-white'
          )}
        >
          Inactive
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full font-bold',
            activeTab === 'inactive' ? 'bg-white/20 text-white' : 'bg-white/10 text-muted-foreground'
          )}>
            {inactiveMethods.length}
          </span>
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 skeleton rounded-xl" />)}
        </div>
      ) : displayedMethods.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground">
            {activeTab === 'active' ? 'No active payment methods.' : 'No inactive payment methods.'}
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={displayedMethods.map(m => m.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {displayedMethods.map((m) => (
                <PaymentMethodCard
                  key={m.id}
                  m={m}
                  editingId={editingId}
                  setEditingId={setEditingId}
                  setAddingNew={setAddingNew}
                  toggleActive={toggleActive}
                  updateMutation={updateMutation}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
