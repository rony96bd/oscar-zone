import { useState, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchAllPaymentMethods,
  updatePaymentMethod,
  createPaymentMethod,
  fetchPaymentMethodsDepositStats,
} from '@/services/payments'
import {
  fetchPaymentMethodDrawerBalances,
  fetchPaymentMethodAdjustments,
  createPaymentMethodAdjustment,
} from '@/services/accounting'
import {
  CreditCard,
  ToggleLeft,
  ToggleRight,
  Edit2,
  X,
  Save,
  Plus,
  Minus,
  Loader2,
  QrCode,
  Link as LinkIcon,
  Tag,
  User,
  AlignLeft,
  Upload,
  Trash2,
  GripVertical,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Hash,
  RotateCcw,
  Wallet,
  DollarSign,
  Calendar,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { GAME_ASSETS_BUCKET } from '@/lib/constants'
import type { PaymentMethod } from '@/types'
import { cn, formatCurrency, formatDateTime } from '@/lib/utils'
import { PaymentMethodDepositsModal } from '@/components/admin/PaymentMethodDepositsModal'
import { useAuthStore } from '@/stores/authStore'
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
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from(GAME_ASSETS_BUCKET)
        .getPublicUrl(filePath)

      onChange(data.publicUrl)
      toast.success(`${label} uploaded!`)
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    if (currentUrl) await deleteFromStorage(currentUrl)
    onChange('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
        {label}
      </label>
      <div className="flex items-center gap-4">
        {currentUrl ? (
          <div className="relative group">
            <img
              src={currentUrl}
              alt={label}
              className={cn(previewClass, 'rounded-xl object-contain border border-border bg-white/5 p-1')}
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow"
              title="Remove image"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className={cn(previewClass, 'rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground')}>
            <QrCode className="h-6 w-6 mb-1 opacity-40" />
            <span className="text-[10px]">No image</span>
          </div>
        )}

        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="btn-ghost-neon text-xs px-3 py-1.5 flex items-center gap-1.5"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {uploading ? 'Uploading...' : currentUrl ? 'Change' : `Upload ${label}`}
          </button>
          <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG, WebP under 5MB</p>
        </div>
      </div>
    </div>
  )
}

/* ─────── Form Component ─────── */
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

  const set = (k: keyof PaymentMethod, v: any) =>
    setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Name */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
            Method Name *
          </label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className="game-input pl-9"
              placeholder="e.g. Cash App, Zelle, Bitcoin"
              value={form.name || ''}
              onChange={e => set('name', e.target.value)}
            />
          </div>
        </div>

        {/* Tag / Username */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
            Payment Tag / Handle / Address
          </label>
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className="game-input pl-9"
              placeholder="e.g. $MyCashAppTag or bitcoin-wallet-address"
              value={form.tag || ''}
              onChange={e => set('tag', e.target.value)}
            />
          </div>
        </div>

        {/* Account Name */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
            Account Holder Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className="game-input pl-9"
              placeholder="e.g. John Doe"
              value={form.account_name || ''}
              onChange={e => set('account_name', e.target.value)}
            />
          </div>
        </div>

        {/* Payment Link */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
            Payment Link / Deep Link (URL)
          </label>
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className="game-input pl-9"
              placeholder="e.g. https://cash.app/$cashtag"
              value={form.payment_link || ''}
              onChange={e => set('payment_link', e.target.value)}
            />
          </div>
        </div>

        {/* Min / Max */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
            Min Amount ($)
          </label>
          <input
            type="number"
            className="game-input"
            value={form.minimum_amount ?? 10}
            onChange={e => set('minimum_amount', parseFloat(e.target.value) || 0)}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
            Max Amount ($)
          </label>
          <input
            type="number"
            className="game-input"
            value={form.maximum_amount ?? 1000}
            onChange={e => set('maximum_amount', parseFloat(e.target.value) || 0)}
          />
        </div>

        {/* Agent commission */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
            Agent Commission Rate (%)
          </label>
          <input
            type="number"
            step="0.1"
            className="game-input"
            value={form.agent_commission_rate ?? 0}
            onChange={e => set('agent_commission_rate', parseFloat(e.target.value) || 0)}
          />
        </div>

        {/* Sort order */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
            Display Sort Order
          </label>
          <input
            type="number"
            className="game-input"
            value={form.sort_order ?? 99}
            onChange={e => set('sort_order', parseInt(e.target.value, 10) || 0)}
          />
        </div>
      </div>

      {/* Instructions */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
          Payment Instructions for Customer
        </label>
        <div className="relative">
          <AlignLeft className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <textarea
            rows={3}
            className="game-input pl-9 resize-none"
            placeholder="e.g. Put your game username in the note. Do not mention game words like 'casino'."
            value={form.instructions || ''}
            onChange={e => set('instructions', e.target.value)}
          />
        </div>
      </div>

      {/* Images Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-border">
        <ImageUploader
          label="Method Logo / Icon"
          currentUrl={form.logo_url || ''}
          onChange={url => set('logo_url', url)}
          path="payment-logos"
          previewClass="h-16 w-16"
        />

        <ImageUploader
          label="QR Code Image"
          currentUrl={form.qr_code_url || ''}
          onChange={url => set('qr_code_url', url)}
          path="payment-qrcodes"
          previewClass="h-28 w-28"
        />
      </div>

      {/* Deposit Limit per Tag (Auto-Disable after X orders) */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <Hash className="h-4 w-4 text-primary" />
              <label className="text-xs font-bold text-white uppercase tracking-wider">
                Deposit Limit Per Tag
              </label>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Auto-disables this tag once it receives this number of deposits.
            </p>
          </div>
          {form.id && (form.current_deposits ?? 0) > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-neon-gold bg-neon-gold/10 border border-neon-gold/30 px-2 py-0.5 rounded-md">
                Current: {form.current_deposits || 0} {form.max_deposits ? `/ ${form.max_deposits}` : ''}
              </span>
              <button
                type="button"
                onClick={() => set('current_deposits', 0)}
                className="btn-ghost-neon text-xs px-2.5 py-1 flex items-center gap-1"
                title="Reset current deposit counter to 0"
              >
                <RotateCcw className="h-3 w-3" />
                Reset Counter
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <input
            type="number"
            min="0"
            step="1"
            className="game-input"
            placeholder="e.g. 5, 10 (Leave blank or 0 for unlimited)"
            value={form.max_deposits ?? ''}
            onChange={e => {
              const val = e.target.value ? parseInt(e.target.value, 10) : null
              set('max_deposits', val && val > 0 ? val : null)
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => set('is_agent', !form.is_agent)}
          className="flex items-center gap-2 text-sm text-white"
        >
          {form.is_agent ? (
            <ToggleRight className="h-6 w-6 text-neon-gold" />
          ) : (
            <ToggleLeft className="h-6 w-6 text-muted-foreground" />
          )}
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
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
          ) : (
            <>
              <Save className="h-4 w-4" /> Save Changes
            </>
          )}
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
  onViewDeposits,
  depositStats,
}: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: m.id,
  })

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
      className={cn(
        'glass-card overflow-hidden transition-all',
        !m.is_active && 'opacity-60',
        isDragging && 'shadow-2xl ring-2 ring-primary/50'
      )}
    >
      <div className="p-4 flex items-center gap-4">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-white p-1 rounded transition-colors touch-none"
          title="Drag to reorder display priority"
        >
          <GripVertical className="h-5 w-5" />
        </button>

        {/* Logo */}
        {m.logo_url ? (
          <img
            src={m.logo_url}
            alt={m.name}
            className="h-10 w-10 rounded-xl object-contain border border-border bg-white/5 p-1 flex-shrink-0"
          />
        ) : (
          <div className="h-10 w-10 rounded-xl border border-border bg-white/5 flex items-center justify-center flex-shrink-0">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
        )}

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-base truncate">{m.name}</span>
            {m.is_agent && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neon-gold/20 text-neon-gold border border-neon-gold/30">
                Agent
              </span>
            )}
            {m.is_active ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neon-green/20 text-neon-green border border-neon-green/30">
                Active
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                Inactive
              </span>
            )}
            {m.max_deposits && m.max_deposits > 0 && (
              <span
                className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                  (m.current_deposits || 0) >= m.max_deposits
                    ? 'bg-destructive/20 text-destructive border-destructive/30'
                    : 'bg-primary/20 text-primary border-primary/30'
                )}
              >
                Limit: {m.current_deposits || 0} / {m.max_deposits}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
            {m.tag && (
              <span className="font-mono text-primary/80">Tag: {m.tag}</span>
            )}
            {m.account_name && <span>Account: {m.account_name}</span>}
            <span>
              ${m.minimum_amount} - ${m.maximum_amount}
            </span>
            <span className="flex items-center gap-1 text-neon-gold">
              <Receipt className="h-3.5 w-3.5" />
              {depositStats?.count ? (
                <>
                  {depositStats.count} {depositStats.count === 1 ? 'Deposit' : 'Deposits'}
                  <span className="text-white font-mono">({formatCurrency(depositStats.totalAmount)})</span>
                </>
              ) : (
                '0 Deposits'
              )}
            </span>
            <span className="text-xs text-muted-foreground/50">Sort: {m.sort_order}</span>
          </div>
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
        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onViewDeposits(m)}
            className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 hover:text-white transition-all text-xs font-semibold"
            title="View all deposits sent to this payment method"
          >
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Deposits</span>
          </button>
          {m.max_deposits && m.max_deposits > 0 && (m.current_deposits || 0) > 0 && (
            <button
              type="button"
              onClick={() => {
                updateMutation.mutate({ id: m.id, updates: { current_deposits: 0 } })
                toast.success(`Deposit counter reset to 0 for ${m.name}`)
              }}
              className="h-9 px-2.5 flex items-center gap-1 rounded-lg border border-white/10 hover:border-primary/40 bg-white/5 text-muted-foreground hover:text-white transition-all text-xs font-semibold"
              title="Reset deposit counter back to 0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reset Limit</span>
            </button>
          )}
          <button
            onClick={() => {
              setEditingId(editingId === m.id ? null : m.id)
              setAddingNew(false)
            }}
            className={cn(
              'h-9 w-9 flex items-center justify-center rounded-lg border transition-all',
              editingId === m.id
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:bg-white/10'
            )}
            title="Edit payment method"
          >
            {editingId === m.id ? <X className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
          </button>
          <button
            onClick={() => toggleActive(m)}
            className="transition-all"
            title="Toggle active status"
          >
            {m.is_active ? (
              <ToggleRight className="h-8 w-8 text-neon-green" />
            ) : (
              <ToggleLeft className="h-8 w-8 text-muted-foreground" />
            )}
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
  const profile = useAuthStore((state) => state.profile)

  // Top view mode: 'drawer' (Money Drawer from reference video) vs 'catalog' (Method cards)
  const [viewMode, setViewMode] = useState<'drawer' | 'catalog'>('drawer')

  // Money drawer period filter
  const [drawerPeriod, setDrawerPeriod] = useState<'today' | 'week' | 'month' | 'all'>('all')

  // Drawer adjustment modal state
  const [showDrawerModal, setShowDrawerModal] = useState(false)
  const [drawerModalMode, setDrawerModalMode] = useState<'add' | 'withdraw'>('add')
  const [selectedMethodId, setSelectedMethodId] = useState('')
  const [drawerAmount, setDrawerAmount] = useState('')
  const [drawerNotes, setDrawerNotes] = useState('')

  // Catalog state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const [viewingDepositsMethod, setViewingDepositsMethod] = useState<PaymentMethod | null>(null)
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active')

  // Queries
  const { data: methods = [], isLoading } = useQuery({
    queryKey: ['admin-payment-methods'],
    queryFn: fetchAllPaymentMethods,
    select: (data) => [...data].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
  })

  const { data: depositStats = {} } = useQuery({
    queryKey: ['admin-payment-methods-deposit-stats'],
    queryFn: fetchPaymentMethodsDepositStats,
    refetchInterval: 30000,
  })

  // Drawer Balances Query
  const { data: drawerBalances = [], isLoading: drawerLoading } = useQuery({
    queryKey: ['pm-drawer-balances', drawerPeriod],
    queryFn: () => fetchPaymentMethodDrawerBalances(drawerPeriod),
  })

  // Drawer Adjustment Logs Query
  const { data: drawerAdjustments = [] } = useQuery({
    queryKey: ['pm-drawer-adjustments'],
    queryFn: fetchPaymentMethodAdjustments,
  })

  // Calculate Drawer Totals
  const drawerTotals = useMemo(() => {
    return drawerBalances.reduce(
      (acc, b) => {
        acc.balance += b.balance
        acc.added += b.added
        acc.deposits += b.deposits
        acc.cashouts += b.cashouts
        acc.withdrawn += b.withdrawn
        return acc
      },
      { balance: 0, added: 0, deposits: 0, cashouts: 0, withdrawn: 0 }
    )
  }, [drawerBalances])

  // Mutation for Add / Withdraw Float
  const drawerAdjustmentMutation = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(drawerAmount)
      if (!selectedMethodId) throw new Error('Please select a payment method')
      if (isNaN(amt) || amt <= 0) throw new Error('Please enter a valid amount')

      await createPaymentMethodAdjustment({
        payment_method_id: selectedMethodId,
        type: drawerModalMode,
        amount: amt,
        notes:
          drawerNotes.trim() ||
          (drawerModalMode === 'add' ? 'Added float to drawer' : 'Withdrew funds from drawer'),
        created_by: profile?.id,
      })
    },
    onSuccess: () => {
      toast.success(
        drawerModalMode === 'add'
          ? 'Money added to drawer float successfully!'
          : 'Money withdrawn from drawer successfully!'
      )
      setShowDrawerModal(false)
      setSelectedMethodId('')
      setDrawerAmount('')
      setDrawerNotes('')
      qc.invalidateQueries({ queryKey: ['pm-drawer-balances'] })
      qc.invalidateQueries({ queryKey: ['pm-drawer-adjustments'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update drawer')
    },
  })

  const openDrawerModal = (mode: 'add' | 'withdraw', preselectedId?: string) => {
    setDrawerModalMode(mode)
    if (preselectedId) setSelectedMethodId(preselectedId)
    setDrawerAmount('')
    setDrawerNotes('')
    setShowDrawerModal(true)
  }

  // Catalog DnD sensors & handlers
  const activeMethods = (methods as PaymentMethod[]).filter((m) => m.is_active)
  const inactiveMethods = (methods as PaymentMethod[]).filter((m) => !m.is_active)
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

  const toggleActive = (m: PaymentMethod) => {
    const isActivating = !m.is_active
    if (
      isActivating &&
      m.max_deposits &&
      m.max_deposits > 0 &&
      (m.current_deposits || 0) >= m.max_deposits
    ) {
      updateMutation.mutate({
        id: m.id,
        updates: { is_active: true, current_deposits: 0 },
      })
      toast.success(`${m.name} activated and deposit limit counter reset to 0!`)
    } else {
      updateMutation.mutate({ id: m.id, updates: { is_active: isActivating } })
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const currentList = [...displayedMethods]
    const oldIndex = currentList.findIndex((m) => m.id === active.id)
    const newIndex = currentList.findIndex((m) => m.id === over.id)
    const reordered = arrayMove(currentList, oldIndex, newIndex)

    const updates = reordered.map((m: PaymentMethod, idx: number) => ({
      id: m.id,
      sort_order: idx + 1,
    }))

    toast.promise(
      Promise.all(
        updates.map((u: any) =>
          updatePaymentMethod(u.id, { sort_order: u.sort_order })
        )
      ),
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
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header & Main Mode Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-gaming font-bold text-white flex items-center gap-2">
            <Wallet className="h-6 w-6 text-neon-gold" /> Payment Methods & Money Drawer
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage physical & digital money drawers (float balances) and payment gateway tags.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 p-1 bg-black/40 rounded-xl border border-white/10 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('drawer')}
            className={cn(
              'px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2',
              viewMode === 'drawer'
                ? 'bg-primary text-black shadow-lg shadow-primary/20'
                : 'text-muted-foreground hover:text-white'
            )}
          >
            <DollarSign className="h-4 w-4" />
            Money Drawer
          </button>
          <button
            onClick={() => setViewMode('catalog')}
            className={cn(
              'px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2',
              viewMode === 'catalog'
                ? 'bg-primary text-black shadow-lg shadow-primary/20'
                : 'text-muted-foreground hover:text-white'
            )}
          >
            <CreditCard className="h-4 w-4" />
            Catalog & Tags ({methods.length})
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODE 1: MONEY DRAWER BALANCES (Reference Video Feature)        */}
      {/* ============================================================== */}
      {viewMode === 'drawer' && (
        <div className="space-y-6 animate-fade-in">
          {/* Action Bar & Period Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-4 rounded-2xl border border-white/10">
            {/* Period Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground mr-1 uppercase tracking-wider">
                Period:
              </span>
              {[
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
                { id: 'all', label: 'All Time' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setDrawerPeriod(p.id as any)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                    drawerPeriod === p.id
                      ? 'bg-neon-gold text-black font-bold shadow-md shadow-neon-gold/20'
                      : 'bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Quick Drawer Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => openDrawerModal('add')}
                className="btn-neon px-4 py-2 text-xs flex items-center gap-1.5 font-bold"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Money (Float In)
              </button>
              <button
                onClick={() => openDrawerModal('withdraw')}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600/20 text-rose-400 border border-rose-500/30 hover:bg-rose-600/30 transition-all flex items-center gap-1.5"
              >
                <Minus className="h-3.5 w-3.5" />
                Withdraw Money (Sweep)
              </button>
            </div>
          </div>

          {/* 5 Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="glass-card p-4 rounded-xl border border-neon-gold/30 bg-neon-gold/5 col-span-2 sm:col-span-1">
              <p className="text-[11px] font-bold text-neon-gold uppercase tracking-wider mb-1">
                DRAWER BALANCE
              </p>
              <p className="text-2xl font-bold font-mono text-white">
                {formatCurrency(drawerTotals.balance)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Added + Deposits - Cashout - Swept
              </p>
            </div>

            <div className="glass-card p-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5">
              <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
                FLOAT ADDED
              </p>
              <p className="text-xl font-bold font-mono text-emerald-400">
                {formatCurrency(drawerTotals.added)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Admin top-ups</p>
            </div>

            <div className="glass-card p-4 rounded-xl border border-cyan-500/25 bg-cyan-500/5">
              <p className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider mb-1">
                DEPOSITS
              </p>
              <p className="text-xl font-bold font-mono text-cyan-400">
                {formatCurrency(drawerTotals.deposits)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Player loads</p>
            </div>

            <div className="glass-card p-4 rounded-xl border border-rose-500/25 bg-rose-500/5">
              <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-1">
                CASHOUTS
              </p>
              <p className="text-xl font-bold font-mono text-rose-400">
                {formatCurrency(drawerTotals.cashouts)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Paid to players</p>
            </div>

            <div className="glass-card p-4 rounded-xl border border-purple-500/25 bg-purple-500/5">
              <p className="text-[11px] font-bold text-purple-400 uppercase tracking-wider mb-1">
                WITHDRAWN
              </p>
              <p className="text-xl font-bold font-mono text-purple-400">
                {formatCurrency(drawerTotals.withdrawn)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Swept to bank</p>
            </div>
          </div>

          {/* Payment Methods Balances Table (Video Exact Match) */}
          <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-neon-gold" /> Payment Methods Balances
              </h2>
              <span className="text-xs text-muted-foreground font-medium">
                {drawerBalances.length} payment channels
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-muted-foreground font-semibold uppercase text-[10px]">
                    <th className="pb-3">Payment Method</th>
                    <th className="pb-3 text-right">Balance</th>
                    <th className="pb-3 text-right">Added</th>
                    <th className="pb-3 text-right">Deposits</th>
                    <th className="pb-3 text-right">Cashouts</th>
                    <th className="pb-3 text-right">Withdrawn</th>
                    <th className="pb-3 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {drawerBalances.map((b) => {
                    const isPositive = b.balance >= 0

                    return (
                      <tr
                        key={b.payment_method_id}
                        className="hover:bg-white/5 transition-colors"
                      >
                        {/* Method info */}
                        <td className="py-3 font-semibold text-white flex items-center gap-2.5">
                          {b.logo_url ? (
                            <img
                              src={b.logo_url}
                              alt={b.name}
                              className="h-8 w-8 rounded-lg object-contain bg-white/5 p-1 border border-white/10"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-lg bg-neon-gold/15 text-neon-gold flex items-center justify-center font-bold text-xs">
                              <CreditCard className="h-4 w-4" />
                            </div>
                          )}
                          <div>
                            <span className="block text-white font-bold">{b.name}</span>
                            {b.display_name && (
                              <span className="text-[10px] text-muted-foreground">
                                {b.display_name}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Balance */}
                        <td className="py-3 text-right">
                          <span
                            className={cn(
                              'text-sm font-bold font-mono',
                              isPositive ? 'text-neon-green' : 'text-rose-400'
                            )}
                          >
                            {formatCurrency(b.balance)}
                          </span>
                        </td>

                        {/* Added */}
                        <td className="py-3 text-right font-mono font-semibold text-emerald-400">
                          {formatCurrency(b.added)}
                        </td>

                        {/* Deposits */}
                        <td className="py-3 text-right font-mono font-semibold text-cyan-400">
                          {formatCurrency(b.deposits)}
                        </td>

                        {/* Cashouts */}
                        <td className="py-3 text-right font-mono font-semibold text-rose-400">
                          {formatCurrency(b.cashouts)}
                        </td>

                        {/* Withdrawn */}
                        <td className="py-3 text-right font-mono font-semibold text-purple-400">
                          {formatCurrency(b.withdrawn)}
                        </td>

                        {/* Quick Actions */}
                        <td className="py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => openDrawerModal('add', b.payment_method_id)}
                              className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                              title="Add float to this drawer"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => openDrawerModal('withdraw', b.payment_method_id)}
                              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                              title="Withdraw / sweep funds from this drawer"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {drawerBalances.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No payment method drawer data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Drawer Adjustments History Table */}
          <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Money Drawer Operation History
              </h2>
              <span className="text-xs text-muted-foreground">
                {drawerAdjustments.length} adjustment(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-muted-foreground font-semibold uppercase text-[10px]">
                    <th className="pb-3">Date & Time</th>
                    <th className="pb-3">Payment Method</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3 text-right">Amount ($)</th>
                    <th className="pb-3">Staff</th>
                    <th className="pb-3">Notes / Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {drawerAdjustments.map((adj) => {
                    const isAdd = adj.type === 'add'

                    return (
                      <tr key={adj.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 text-muted-foreground whitespace-nowrap">
                          {formatDateTime(adj.created_at)}
                        </td>
                        <td className="py-3 font-semibold text-white">
                          {adj.payment_method?.name || 'Unknown Method'}
                        </td>
                        <td className="py-3">
                          <span
                            className={cn(
                              'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                              isAdd
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            )}
                          >
                            {isAdd ? 'Float Added' : 'Withdrawn'}
                          </span>
                        </td>
                        <td className="py-3 text-right font-mono font-bold">
                          <span
                            className={isAdd ? 'text-emerald-400' : 'text-rose-400'}
                          >
                            {isAdd ? '+' : '-'}
                            {formatCurrency(adj.amount)}
                          </span>
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {adj.profile?.full_name || 'Admin'}
                        </td>
                        <td className="py-3 text-muted-foreground max-w-xs truncate">
                          {adj.notes || '—'}
                        </td>
                      </tr>
                    )
                  })}
                  {drawerAdjustments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No manual drawer float adjustments recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 2: CATALOG & TAG MANAGEMENT                               */}
      {/* ============================================================== */}
      {viewMode === 'catalog' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Payment Gateways & QR Codes</h2>
              <p className="text-xs text-muted-foreground">
                Drag to reorder, configure account names, deposit thresholds, and custom tags.
              </p>
            </div>
            <button
              onClick={() => {
                setAddingNew(true)
                setEditingId(null)
              }}
              className="btn-neon px-4 py-2 text-xs flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Add Method
            </button>
          </div>

          {/* Add New Form */}
          {addingNew && (
            <div className="glass-card p-6 border-2 border-primary/30 rounded-2xl">
              <h3 className="font-bold text-white mb-5 flex items-center gap-2 text-sm">
                <Plus className="h-4 w-4 text-primary" /> New Payment Method
              </h3>
              <PaymentMethodForm
                initial={EMPTY_METHOD}
                onSave={(data) => createMutation.mutate(data)}
                onCancel={() => setAddingNew(false)}
                isSaving={createMutation.isPending}
              />
            </div>
          )}

          {/* Active / Inactive Tabs */}
          <div className="flex gap-1 p-1 bg-black/30 rounded-xl border border-white/5 w-fit">
            <button
              onClick={() => setActiveTab('active')}
              className={cn(
                'px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2',
                activeTab === 'active'
                  ? 'bg-neon-green/20 text-neon-green border border-neon-green/30'
                  : 'text-muted-foreground hover:text-white'
              )}
            >
              Active
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                  activeTab === 'active'
                    ? 'bg-neon-green/20 text-neon-green'
                    : 'bg-white/10 text-muted-foreground'
                )}
              >
                {activeMethods.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('inactive')}
              className={cn(
                'px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2',
                activeTab === 'inactive'
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-muted-foreground hover:text-white'
              )}
            >
              Inactive
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                  activeTab === 'inactive'
                    ? 'bg-white/20 text-white'
                    : 'bg-white/10 text-muted-foreground'
                )}
              >
                {inactiveMethods.length}
              </span>
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 skeleton rounded-xl" />
              ))}
            </div>
          ) : displayedMethods.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <p className="text-muted-foreground text-sm">
                {activeTab === 'active'
                  ? 'No active payment methods.'
                  : 'No inactive payment methods.'}
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={displayedMethods.map((m) => m.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {displayedMethods.map((m) => (
                    <PaymentMethodCard
                      key={m.id}
                      m={m}
                      editingId={editingId}
                      setEditingId={setEditingId}
                      setAddingNew={setAddingNew}
                      toggleActive={toggleActive}
                      updateMutation={updateMutation}
                      onViewDeposits={setViewingDepositsMethod}
                      depositStats={depositStats[m.id]}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Deposit Logs Modal */}
          {viewingDepositsMethod && (
            <PaymentMethodDepositsModal
              method={viewingDepositsMethod}
              onClose={() => setViewingDepositsMethod(null)}
            />
          )}
        </div>
      )}

      {/* Add / Withdraw Money Drawer Modal */}
      {showDrawerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 rounded-2xl border border-white/20 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="font-gaming font-bold text-lg text-white mb-1 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-neon-gold" />
              {drawerModalMode === 'add'
                ? 'Add Money to Drawer (Float In)'
                : 'Withdraw Money from Drawer (Sweep Out)'}
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              {drawerModalMode === 'add'
                ? 'Record cash/float injected into this payment method balance.'
                : 'Record profits or funds transferred out of this payment method.'}
            </p>

            {/* Mode Toggle */}
            <div className="flex gap-2 p-1 bg-black/40 rounded-xl mb-4 border border-white/10">
              <button
                type="button"
                onClick={() => setDrawerModalMode('add')}
                className={cn(
                  'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5',
                  drawerModalMode === 'add'
                    ? 'bg-emerald-600 text-white font-bold shadow'
                    : 'text-muted-foreground hover:text-white'
                )}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Float (In)
              </button>
              <button
                type="button"
                onClick={() => setDrawerModalMode('withdraw')}
                className={cn(
                  'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5',
                  drawerModalMode === 'withdraw'
                    ? 'bg-rose-600 text-white font-bold shadow'
                    : 'text-muted-foreground hover:text-white'
                )}
              >
                <Minus className="h-3.5 w-3.5" />
                Withdraw (Sweep)
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-medium text-white mb-1 block">
                  Payment Method *
                </label>
                <select
                  className="game-input w-full text-xs"
                  value={selectedMethodId}
                  onChange={(e) => setSelectedMethodId(e.target.value)}
                >
                  <option value="">-- Choose Payment Method --</option>
                  {methods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.name} {method.tag ? `(${method.tag})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-white mb-1 block">
                  Amount ($) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  className="game-input w-full text-xs font-mono font-bold"
                  placeholder="e.g. 500.00"
                  value={drawerAmount}
                  onChange={(e) => setDrawerAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-white mb-1 block">
                  Reason / Purpose Note
                </label>
                <input
                  type="text"
                  className="game-input w-full text-xs"
                  placeholder={
                    drawerModalMode === 'add'
                      ? 'e.g. Injected initial opening float'
                      : 'e.g. Swept profit to cold wallet'
                  }
                  value={drawerNotes}
                  onChange={(e) => setDrawerNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDrawerModal(false)}
                className="btn-ghost-neon px-4 py-2 text-xs"
                disabled={drawerAdjustmentMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={() => drawerAdjustmentMutation.mutate()}
                className={cn(
                  'px-4 py-2 text-xs font-bold rounded-xl transition-all',
                  drawerModalMode === 'add'
                    ? 'btn-neon'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                )}
                disabled={
                  drawerAdjustmentMutation.isPending ||
                  !drawerAmount ||
                  !selectedMethodId
                }
              >
                {drawerAdjustmentMutation.isPending
                  ? 'Saving...'
                  : drawerModalMode === 'add'
                  ? 'Confirm Float In'
                  : 'Confirm Withdrawal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
