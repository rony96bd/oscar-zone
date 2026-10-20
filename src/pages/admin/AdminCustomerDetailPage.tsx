import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchCustomerDetail,
  updateCustomerStatus,
  assignCustomerGame,
  updateCustomerProfile,
  deleteCustomer,
  updateCustomerFreePlayLimit,
  updateCustomerBonus,
} from '@/services/admin'
import { fetchGames } from '@/services/games'
import { CreateOrderModal } from '@/components/admin/CreateOrderModal'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import {
  formatCurrency,
  formatRelativeTime,
  getOrderStatusClass,
  getOrderStatusLabel,
  cn,
} from '@/lib/utils'
import {
  Zap,
  ShoppingBag,
  Star,
  Lock,
  Edit2,
  X,
  Check,
  Trophy,
  ArrowDownCircle,
  ArrowUpCircle,
  Activity,
  TrendingDown,
  TrendingUp,
  Gift,
  Download,
  Trash2,
  ArrowLeft,
  CreditCard,
  Gamepad2,
  Phone,
  Mail,
  AlertTriangle,
  Percent,
  DollarSign,
  Shield,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

interface VipTier {
  level: number
  name: string
  minSpend: number
  maxSpend: number
}

const VIP_TIERS: VipTier[] = [
  { level: 0, name: 'Level 0 (Bronze)', minSpend: 0, maxSpend: 500 },
  { level: 1, name: 'Level 1 (Silver)', minSpend: 500, maxSpend: 1000 },
  { level: 2, name: 'Level 2 (Gold)', minSpend: 1000, maxSpend: 2500 },
  { level: 3, name: 'Level 3 (Platinum)', minSpend: 2500, maxSpend: 5000 },
  { level: 4, name: 'Level 4 (Diamond)', minSpend: 5000, maxSpend: 10000 },
  { level: 5, name: 'Level 5 (Elite)', minSpend: 10000, maxSpend: Infinity },
]

function getVipInfo(totalSpent: number) {
  const currentTier =
    VIP_TIERS.find((t) => totalSpent >= t.minSpend && totalSpent < t.maxSpend) ||
    VIP_TIERS[VIP_TIERS.length - 1]
  const nextTier = VIP_TIERS[currentTier.level + 1] || null
  const progressPercent = nextTier
    ? Math.min(
        100,
        Math.max(
          0,
          ((totalSpent - currentTier.minSpend) /
            (nextTier.minSpend - currentTier.minSpend)) *
            100
        )
      )
    : 100
  const needed = nextTier ? Math.max(0, nextTier.minSpend - totalSpent) : 0
  return { currentTier, nextTier, progressPercent, needed }
}

export default function AdminCustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const navigate = useNavigate()

  // State
  const [activeTab, setActiveTab] = useState<
    'loads' | 'cashouts' | 'free_play' | 'accounts' | 'settings'
  >('loads')
  const [isLogLoadOpen, setIsLogLoadOpen] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [customBonus, setCustomBonus] = useState<string>('')
  const [useCustomFreePlay, setUseCustomFreePlay] = useState<boolean>(false)
  const [customFpLimit, setCustomFpLimit] = useState<number>(1)

  const [editData, setEditData] = useState({
    full_name: '',
    username: '',
    phone: '',
    telegram: '',
    notes: '',
  })

  // Queries
  const { data: customer, isLoading } = useQuery({
    queryKey: ['admin-customer', id],
    queryFn: () => fetchCustomerDetail(id!),
    enabled: !!id,
  })

  const { data: games } = useQuery({
    queryKey: ['games-active'],
    queryFn: fetchGames,
  })

  // Initialize form state from customer data
  useEffect(() => {
    if (customer) {
      setEditData({
        full_name: customer.full_name || '',
        username: customer.username || '',
        phone: customer.phone || '',
        telegram: customer.telegram || '',
        notes: customer.notes || '',
      })
      if (
        customer.custom_free_play_limit !== null &&
        customer.custom_free_play_limit !== undefined
      ) {
        setUseCustomFreePlay(true)
        setCustomFpLimit(customer.custom_free_play_limit)
      } else {
        setUseCustomFreePlay(false)
        setCustomFpLimit(1)
      }
      setCustomBonus(
        customer.custom_bonus_percentage !== null &&
          customer.custom_bonus_percentage !== undefined
          ? String(customer.custom_bonus_percentage)
          : ''
      )
    }
  }, [customer])

  // Mutations
  const statusMutation = useMutation({
    mutationFn: (status: string) => updateCustomerStatus(id!, status),
    onSuccess: () => {
      toast.success('Status updated')
      qc.invalidateQueries({ queryKey: ['admin-customer', id] })
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update status'),
  })

  const updateProfileMutation = useMutation({
    mutationFn: (data: typeof editData) => updateCustomerProfile(id!, data),
    onSuccess: () => {
      toast.success('Profile updated successfully')
      setIsEditingProfile(false)
      qc.invalidateQueries({ queryKey: ['admin-customer', id] })
    },
    onError: (err: any) =>
      toast.error(err.message || 'Failed to update profile'),
  })

  const updateVisibilityMutation = useMutation({
    mutationFn: async (is_hidden: boolean) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_hidden_from_public: is_hidden })
        .eq('id', id!)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Public visibility updated')
      qc.invalidateQueries({ queryKey: ['admin-customer', id] })
    },
    onError: (err: any) =>
      toast.error(err.message || 'Failed to update visibility'),
  })

  const freePlayLimitMutation = useMutation({
    mutationFn: (limit: number | null) =>
      updateCustomerFreePlayLimit(id!, limit),
    onSuccess: () => {
      toast.success('Free Play settings updated successfully')
      qc.invalidateQueries({ queryKey: ['admin-customer', id] })
    },
    onError: (err: any) =>
      toast.error(err.message || 'Failed to update Free Play limit'),
  })

  const bonusMutation = useMutation({
    mutationFn: (bonusPct: number) => updateCustomerBonus(id!, bonusPct),
    onSuccess: () => {
      toast.success('Custom bonus updated')
      qc.invalidateQueries({ queryKey: ['admin-customer', id] })
    },
    onError: (err: any) =>
      toast.error(err.message || 'Failed to update custom bonus'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteCustomer(id!),
    onSuccess: () => {
      toast.success('Customer and all related data deleted successfully')
      navigate('/admin/customers')
    },
    onError: (err: any) =>
      toast.error(err.message || 'Failed to delete customer'),
  })

  const passwordMutation = useMutation({
    mutationFn: async (password: string) => {
      const { data, error } = await supabase.functions.invoke(
        'admin-set-password',
        {
          body: { userId: id, newPassword: password },
        }
      )
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      toast.success('Password updated successfully')
      setNewPassword('')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update password')
    },
  })

  const assignGameMutation = useMutation({
    mutationFn: (data: {
      gameId: string
      username: string
      status: string
      password?: string
    }) => assignCustomerGame(id!, data.gameId, data.username, data.password),
    onSuccess: () => {
      toast.success('Game account linked successfully')
      qc.invalidateQueries({ queryKey: ['admin-customer', id] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Calculations for 360 Player Analytics
  const orders = useMemo(() => (customer?.orders || []) as any[], [customer])
  const cashouts = useMemo(() => (customer?.cashouts || []) as any[], [customer])
  const freePlays = useMemo(
    () => (customer?.free_plays || []) as any[],
    [customer]
  )
  const customerGames = useMemo(
    () => (customer?.customer_games || []) as any[],
    [customer]
  )

  const completedOrders = useMemo(
    () => orders.filter((o) => o.status === 'completed'),
    [orders]
  )
  const approvedCashouts = useMemo(
    () => cashouts.filter((c) => c.status === 'approved'),
    [cashouts]
  )

  // 8 Stat Card Values
  const totalSpent = useMemo(
    () =>
      completedOrders
        .filter((o) => !o.is_free_play)
        .reduce((sum, o) => sum + parseFloat(o.base_amount || 0), 0),
    [completedOrders]
  )

  const pointsLoaded = useMemo(
    () =>
      completedOrders.reduce(
        (sum, o) => sum + parseFloat(o.final_credit || 0),
        0
      ),
    [completedOrders]
  )

  const bonusReceived = useMemo(
    () =>
      completedOrders.reduce(
        (sum, o) =>
          sum +
          parseFloat(o.total_bonus_amount || o.total_bonus || 0),
        0
      ),
    [completedOrders]
  )

  const cashedOut = useMemo(
    () =>
      approvedCashouts.reduce(
        (sum, c) => sum + parseFloat(c.amount || 0),
        0
      ),
    [approvedCashouts]
  )

  const freePlayPoints = useMemo(() => {
    const orderFreePlay = completedOrders
      .filter((o) => o.is_free_play)
      .reduce((sum, o) => sum + parseFloat(o.final_credit || 0), 0)
    return orderFreePlay
  }, [completedOrders])

  const net = totalSpent - cashedOut
  const loadsCount = completedOrders.length
  const averageLoad = loadsCount > 0 ? totalSpent / loadsCount : 0

  // VIP Tier Calculations
  const vipInfo = useMemo(() => getVipInfo(totalSpent), [totalSpent])

  // BY GAME Aggregation
  const byGameBreakdown = useMemo(() => {
    const map = new Map<
      string,
      { gameName: string; logoUrl?: string; loads: number; received: number; points: number }
    >()
    for (const o of completedOrders) {
      const gName = o.game?.name || 'Unknown Game'
      const key = gName
      const existing = map.get(key) || {
        gameName: gName,
        logoUrl: o.game?.logo_url,
        loads: 0,
        received: 0,
        points: 0,
      }
      existing.loads += 1
      existing.received += parseFloat(o.base_amount || 0)
      existing.points += parseFloat(o.final_credit || 0)
      map.set(key, existing)
    }
    return Array.from(map.values()).sort((a, b) => b.received - a.received)
  }, [completedOrders])

  // BY PAYMENT METHOD Aggregation
  const byPaymentBreakdown = useMemo(() => {
    const map = new Map<
      string,
      { methodName: string; loads: number; received: number; points: number }
    >()
    for (const o of completedOrders) {
      const mName =
        o.payment_method?.display_name ||
        o.payment_method?.name ||
        o.customer_payment_tag ||
        (o.is_free_play ? 'Free Play' : 'Manual / Other')
      const key = mName
      const existing = map.get(key) || {
        methodName: mName,
        loads: 0,
        received: 0,
        points: 0,
      }
      existing.loads += 1
      existing.received += parseFloat(o.base_amount || 0)
      existing.points += parseFloat(o.final_credit || 0)
      map.set(key, existing)
    }
    return Array.from(map.values()).sort((a, b) => b.received - a.received)
  }, [completedOrders])

  // Export CSV handler
  const handleExportCsv = () => {
    if (!customer) return
    const rows: string[][] = [
      [
        'Type',
        'Reference ID',
        'Date & Time',
        'Game',
        'Payment Method / Sent Via',
        'Amount ($)',
        'Points (pts)',
        'Status',
        'Admin Note',
      ],
    ]

    orders.forEach((o) => {
      rows.push([
        o.is_free_play ? 'Free Play Load' : 'Game Load',
        o.order_number || o.id,
        new Date(o.created_at).toLocaleString(),
        o.game?.name || 'N/A',
        o.payment_method?.name || o.customer_payment_tag || 'N/A',
        parseFloat(o.base_amount || 0).toFixed(2),
        parseFloat(o.final_credit || 0).toFixed(0),
        o.status,
        o.admin_note || '',
      ])
    })

    cashouts.forEach((c) => {
      rows.push([
        'Cashout',
        c.request_number || c.id,
        new Date(c.created_at).toLocaleString(),
        c.game_name || 'N/A',
        c.payment_method_name || 'N/A',
        parseFloat(c.amount || 0).toFixed(2),
        '0',
        c.status,
        c.admin_note || '',
      ])
    })

    freePlays.forEach((f) => {
      rows.push([
        'Free Play Request',
        f.id,
        new Date(f.created_at).toLocaleString(),
        f.game?.name || 'N/A',
        'Free Play Bonus',
        '0.00',
        String(f.points || 0),
        f.status,
        '',
      ])
    })

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      rows
        .map((row) =>
          row
            .map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`)
            .join(',')
        )
        .join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `customer_${customer.username || customer.id}_statement.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('CSV statement exported')
  }

  if (isLoading) return <PageLoader />
  if (!customer) {
    return (
      <div className="text-center text-muted-foreground py-16">
        Customer not found
      </div>
    )
  }

  const c = customer as any

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Back button */}
      <div>
        <Link
          to="/admin/customers"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Customers
        </Link>
      </div>

      {/* Hero Header Card */}
      <div className="glass-card p-6 rounded-2xl border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          {/* Left Avatar & Meta */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-br from-primary/30 to-purple-600/20 border border-primary/40 flex items-center justify-center shadow-lg shadow-primary/10">
                <span className="text-2xl sm:text-3xl font-gaming font-bold text-primary">
                  {(c.full_name || c.username)?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <span
                className={cn(
                  'absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-background flex items-center justify-center text-[10px]',
                  c.account_status === 'active'
                    ? 'bg-neon-green text-black'
                    : c.account_status === 'suspended'
                    ? 'bg-destructive text-white'
                    : 'bg-yellow-500 text-black'
                )}
                title={`Status: ${c.account_status}`}
              >
                ●
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-gaming font-bold text-white tracking-wide">
                  {c.full_name || c.username || 'Unnamed Player'}
                </h1>
                {c.is_vip && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-neon-gold/20 text-neon-gold border border-neon-gold/40 flex items-center gap-1">
                    <Trophy className="h-3 w-3" /> VIP
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-muted-foreground uppercase">
                  {c.account_status}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/15 text-primary border border-primary/30">
                  {vipInfo.currentTier.name}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted-foreground">
                <span className="font-mono text-primary/80">@{c.username}</span>
                {c.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {c.email}
                  </span>
                )}
                {c.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {c.phone}
                  </span>
                )}
                {c.telegram && (
                  <span className="text-sky-400">TG: @{c.telegram.replace('@', '')}</span>
                )}
                <span>Joined {formatRelativeTime(c.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              onClick={() => setIsLogLoadOpen(true)}
              className="btn-neon px-4 py-2 text-xs flex items-center gap-1.5 font-bold shadow-lg shadow-primary/20"
            >
              <Zap className="h-3.5 w-3.5" />
              + Log Load
            </button>

            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="btn-ghost-neon px-3.5 py-2 text-xs flex items-center gap-1.5"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit Info
            </button>

            <button
              onClick={handleExportCsv}
              className="btn-ghost-neon px-3.5 py-2 text-xs flex items-center gap-1.5"
              title="Export complete transaction ledger to CSV"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>

            <button
              onClick={() => {
                if (
                  window.confirm(
                    'Are you sure you want to delete this player? All their orders, cashouts, and game records will be permanently removed.'
                  )
                ) {
                  deleteMutation.mutate()
                }
              }}
              disabled={deleteMutation.isPending}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25 transition-all flex items-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>

        {/* Inline Edit Form Modal / Accordion */}
        {isEditingProfile && (
          <div className="mt-6 pt-6 border-t border-white/10 animate-fade-in">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-primary" /> Edit Player Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  className="game-input text-xs py-1.5 px-3 w-full"
                  placeholder="Full Name"
                  value={editData.full_name}
                  onChange={(e) =>
                    setEditData({ ...editData, full_name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">
                  Username
                </label>
                <input
                  type="text"
                  className="game-input text-xs py-1.5 px-3 w-full"
                  placeholder="Username"
                  value={editData.username}
                  onChange={(e) =>
                    setEditData({ ...editData, username: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  className="game-input text-xs py-1.5 px-3 w-full"
                  placeholder="Phone Number"
                  value={editData.phone}
                  onChange={(e) =>
                    setEditData({ ...editData, phone: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">
                  Telegram Username
                </label>
                <input
                  type="text"
                  className="game-input text-xs py-1.5 px-3 w-full"
                  placeholder="e.g. johndoe"
                  value={editData.telegram}
                  onChange={(e) =>
                    setEditData({ ...editData, telegram: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="text-[11px] text-muted-foreground block mb-1">
                Admin Notes / Marketing Source Tag (e.g. FB Page 0.2.3)
              </label>
              <textarea
                className="game-input text-xs py-2 px-3 w-full h-16 resize-none"
                placeholder="Add internal notes about this player or marketing tag..."
                value={editData.notes}
                onChange={(e) =>
                  setEditData({ ...editData, notes: e.target.value })
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsEditingProfile(false)}
                className="btn-ghost-neon px-3 py-1.5 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => updateProfileMutation.mutate(editData)}
                disabled={updateProfileMutation.isPending}
                className="btn-neon px-4 py-1.5 text-xs flex items-center gap-1"
              >
                <Check className="h-3.5 w-3.5" /> Save Changes
              </button>
            </div>
          </div>
        )}

        {/* Level Progress Indicator */}
        <div className="mt-6 pt-5 border-t border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 text-xs">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-neon-gold" />
              <span className="font-semibold text-white">
                {vipInfo.currentTier.name}
              </span>
              {vipInfo.nextTier ? (
                <span className="text-muted-foreground">
                  —{' '}
                  <strong className="text-neon-gold">
                    {formatCurrency(vipInfo.needed)}
                  </strong>{' '}
                  more to {vipInfo.nextTier.name} ({formatCurrency(vipInfo.nextTier.minSpend)})
                </span>
              ) : (
                <span className="text-neon-gold font-bold">
                  ★ Maximum VIP Level Reached
                </span>
              )}
            </div>
            <span className="text-muted-foreground font-mono">
              {formatCurrency(totalSpent)} spent ({vipInfo.progressPercent.toFixed(1)}%)
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-white/5 border border-white/10 overflow-hidden relative">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary via-neon-green to-neon-gold transition-all duration-500 shadow-[0_0_12px_rgba(0,212,255,0.5)]"
              style={{ width: `${vipInfo.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 8 Stat Cards (Video Match) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* 1. Total Spent */}
        <div className="glass-card p-3.5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              TOTAL SPENT
            </span>
            <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <p className="text-lg font-gaming font-bold text-emerald-400">
            {formatCurrency(totalSpent)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Paid funds</p>
        </div>

        {/* 2. Points Loaded */}
        <div className="glass-card p-3.5 rounded-xl border border-pink-500/25 bg-pink-500/5 hover:border-pink-500/40 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider">
              POINTS LOADED
            </span>
            <Zap className="h-3.5 w-3.5 text-pink-400" />
          </div>
          <p className="text-lg font-gaming font-bold text-pink-400">
            {pointsLoaded.toLocaleString()}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Total credit</p>
        </div>

        {/* 3. Bonus Received */}
        <div className="glass-card p-3.5 rounded-xl border border-cyan-500/25 bg-cyan-500/5 hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
              BONUS REC'D
            </span>
            <Gift className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <p className="text-lg font-gaming font-bold text-cyan-400">
            {formatCurrency(bonusReceived)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Promo bonus</p>
        </div>

        {/* 4. Cashed Out */}
        <div className="glass-card p-3.5 rounded-xl border border-rose-500/25 bg-rose-500/5 hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
              CASHED OUT
            </span>
            <ArrowUpCircle className="h-3.5 w-3.5 text-rose-400" />
          </div>
          <p className="text-lg font-gaming font-bold text-rose-400">
            {formatCurrency(cashedOut)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Approved</p>
        </div>

        {/* 5. Free Play */}
        <div className="glass-card p-3.5 rounded-xl border border-amber-500/25 bg-amber-500/5 hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
              FREE PLAY
            </span>
            <Star className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <p className="text-lg font-gaming font-bold text-amber-400">
            {freePlayPoints.toLocaleString()}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Free credits</p>
        </div>

        {/* 6. Net */}
        <div className="glass-card p-3.5 rounded-xl border border-purple-500/25 bg-purple-500/5 hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
              NET
            </span>
            <Activity className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <p
            className={cn(
              'text-lg font-gaming font-bold',
              net >= 0 ? 'text-purple-400' : 'text-amber-400'
            )}
          >
            {formatCurrency(net)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Spent - Won</p>
        </div>

        {/* 7. Loads */}
        <div className="glass-card p-3.5 rounded-xl border border-teal-500/25 bg-teal-500/5 hover:border-teal-500/40 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">
              LOADS
            </span>
            <ShoppingBag className="h-3.5 w-3.5 text-teal-400" />
          </div>
          <p className="text-lg font-gaming font-bold text-teal-400">
            {loadsCount}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Orders done</p>
        </div>

        {/* 8. Average Load */}
        <div className="glass-card p-3.5 rounded-xl border border-fuchsia-500/25 bg-fuchsia-500/5 hover:border-fuchsia-500/40 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-fuchsia-400 uppercase tracking-wider">
              AVG LOAD
            </span>
            <TrendingUp className="h-3.5 w-3.5 text-fuchsia-400" />
          </div>
          <p className="text-lg font-gaming font-bold text-fuchsia-400">
            {formatCurrency(averageLoad)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Per order</p>
        </div>
      </div>

      {/* Side-by-Side Breakdown Tables: By Game & By Payment Method */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* BY GAME Breakdown */}
        <div className="glass-card p-5 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2 text-sm">
              <Gamepad2 className="h-4 w-4 text-primary" /> BY GAME
            </h2>
            <span className="text-xs text-muted-foreground font-medium">
              {byGameBreakdown.length} game(s) played
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-muted-foreground font-semibold uppercase text-[10px]">
                  <th className="pb-2.5">Game</th>
                  <th className="pb-2.5 text-center">Loads</th>
                  <th className="pb-2.5 text-right">Received</th>
                  <th className="pb-2.5 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {byGameBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">
                      No game activity recorded yet
                    </td>
                  </tr>
                ) : (
                  byGameBreakdown.map((row) => (
                    <tr key={row.gameName} className="hover:bg-white/5 transition-colors">
                      <td className="py-2.5 font-medium text-white flex items-center gap-2">
                        {row.logoUrl ? (
                          <img
                            src={row.logoUrl}
                            alt=""
                            className="h-6 w-6 rounded-md object-cover border border-white/10"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-md bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                            {row.gameName.charAt(0)}
                          </div>
                        )}
                        <span>{row.gameName}</span>
                      </td>
                      <td className="py-2.5 text-center font-mono text-muted-foreground">
                        {row.loads}
                      </td>
                      <td className="py-2.5 text-right font-bold text-emerald-400">
                        {formatCurrency(row.received)}
                      </td>
                      <td className="py-2.5 text-right font-bold text-pink-400">
                        {row.points.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* BY PAYMENT METHOD Breakdown */}
        <div className="glass-card p-5 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2 text-sm">
              <CreditCard className="h-4 w-4 text-neon-gold" /> BY PAYMENT METHOD
            </h2>
            <span className="text-xs text-muted-foreground font-medium">
              {byPaymentBreakdown.length} method(s) used
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-muted-foreground font-semibold uppercase text-[10px]">
                  <th className="pb-2.5">Sent Via</th>
                  <th className="pb-2.5 text-center">Loads</th>
                  <th className="pb-2.5 text-right">Received</th>
                  <th className="pb-2.5 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {byPaymentBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">
                      No payment method activity recorded yet
                    </td>
                  </tr>
                ) : (
                  byPaymentBreakdown.map((row) => (
                    <tr key={row.methodName} className="hover:bg-white/5 transition-colors">
                      <td className="py-2.5 font-medium text-white flex items-center gap-2">
                        <div className="h-6 w-6 rounded-md bg-neon-gold/15 text-neon-gold flex items-center justify-center font-bold text-[10px]">
                          <CreditCard className="h-3 w-3" />
                        </div>
                        <span>{row.methodName}</span>
                      </td>
                      <td className="py-2.5 text-center font-mono text-muted-foreground">
                        {row.loads}
                      </td>
                      <td className="py-2.5 text-right font-bold text-emerald-400">
                        {formatCurrency(row.received)}
                      </td>
                      <td className="py-2.5 text-right font-bold text-pink-400">
                        {row.points.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="glass-card p-1.5 rounded-xl border border-white/10 flex flex-wrap gap-1">
        {[
          { id: 'loads', label: `All Loads (${orders.length})`, icon: ShoppingBag },
          { id: 'cashouts', label: `Cashouts (${cashouts.length})`, icon: ArrowUpCircle },
          { id: 'free_play', label: `Free Play (${freePlays.length})`, icon: Gift },
          { id: 'accounts', label: `In-Game Accounts (${customerGames.length})`, icon: Gamepad2 },
          { id: 'settings', label: 'Security & Settings', icon: Lock },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all',
                isActive
                  ? 'bg-primary text-black font-bold shadow-md shadow-primary/20'
                  : 'text-muted-foreground hover:text-white hover:bg-white/5'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab 1: All Loads */}
      {activeTab === 'loads' && (
        <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-primary" /> Load Transaction Ledger
            </h3>
            <span className="text-xs text-muted-foreground">
              Total {orders.length} order(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-muted-foreground font-semibold uppercase text-[10px]">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Order #</th>
                  <th className="pb-3">Game</th>
                  <th className="pb-3">Sent Via</th>
                  <th className="pb-3 text-right">Amount</th>
                  <th className="pb-3 text-right">Points</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      No load orders found for this player.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(o.created_at)}
                      </td>
                      <td className="py-3 font-mono font-medium text-white">
                        {o.order_number || o.id.slice(0, 8)}
                      </td>
                      <td className="py-3 font-medium text-white">
                        {o.game?.name || 'N/A'}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {o.payment_method?.display_name ||
                          o.payment_method?.name ||
                          o.customer_payment_tag ||
                          (o.is_free_play ? 'Free Play' : 'Manual')}
                      </td>
                      <td className="py-3 text-right font-bold text-emerald-400">
                        {formatCurrency(o.base_amount || 0)}
                      </td>
                      <td className="py-3 text-right font-bold text-pink-400">
                        {parseFloat(o.final_credit || 0).toLocaleString()}
                      </td>
                      <td className="py-3 text-center">
                        <span className={getOrderStatusClass(o.status)}>
                          {getOrderStatusLabel(o.status)}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          to={`/admin/orders/${o.id}`}
                          className="btn-ghost-neon text-[11px] px-2.5 py-1 inline-flex items-center gap-1"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Cashouts */}
      {activeTab === 'cashouts' && (
        <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-rose-400" /> Cashout Requests & Payouts
            </h3>
            <span className="text-xs text-muted-foreground">
              Total {cashouts.length} cashout(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-muted-foreground font-semibold uppercase text-[10px]">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Request #</th>
                  <th className="pb-3">Game</th>
                  <th className="pb-3">Paid Via</th>
                  <th className="pb-3">Destination / Tag</th>
                  <th className="pb-3 text-right">Amount</th>
                  <th className="pb-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {cashouts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No cashout requests found for this player.
                    </td>
                  </tr>
                ) : (
                  cashouts.map((co) => (
                    <tr key={co.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(co.created_at)}
                      </td>
                      <td className="py-3 font-mono font-medium text-white">
                        {co.request_number || co.id.slice(0, 8)}
                      </td>
                      <td className="py-3 font-medium text-white">
                        {co.game_name} ({co.game_username})
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {co.payment_method_name}
                      </td>
                      <td className="py-3 font-mono text-primary/90">
                        {co.payment_detail}
                      </td>
                      <td className="py-3 text-right font-bold text-rose-400">
                        {formatCurrency(co.amount)}
                      </td>
                      <td className="py-3 text-center">
                        <span
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded-full font-bold uppercase',
                            co.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : co.status === 'rejected'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          )}
                        >
                          {co.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Free Play */}
      {activeTab === 'free_play' && (
        <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <Gift className="h-4 w-4 text-neon-gold" /> Free Play Requests & Activity
            </h3>
            <span className="text-xs text-muted-foreground">
              Total {freePlays.length} request(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-muted-foreground font-semibold uppercase text-[10px]">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Game</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 text-right">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {freePlays.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      No free play requests recorded for this player.
                    </td>
                  </tr>
                ) : (
                  freePlays.map((fp) => (
                    <tr key={fp.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(fp.created_at)}
                      </td>
                      <td className="py-3 font-medium text-white">
                        {fp.game?.name || 'Unknown Game'}
                      </td>
                      <td className="py-3 text-center">
                        <span
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded-full font-bold uppercase',
                            fp.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : fp.status === 'rejected'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          )}
                        >
                          {fp.status}
                        </span>
                      </td>
                      <td className="py-3 text-right text-muted-foreground">
                        {formatRelativeTime(fp.updated_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: In-Game Accounts */}
      {activeTab === 'accounts' && (
        <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <Gamepad2 className="h-4 w-4 text-primary" /> Linked In-Game Accounts
            </h3>
            <span className="text-xs text-muted-foreground">
              {customerGames.length} account(s) registered
            </span>
          </div>

          {/* Accounts list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {customerGames.map((cg: any) => (
              <div
                key={cg.id}
                className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between hover:border-primary/40 transition-colors"
              >
                <div>
                  <p className="text-sm font-bold text-white">
                    {cg.game?.name || 'Unknown Game'}
                  </p>
                  <p className="text-xs font-mono text-primary mt-0.5">
                    {cg.username}
                  </p>
                  {cg.game_password && (
                    <p className="text-[11px] text-muted-foreground">
                      Pass: <span className="font-mono text-white/80">{cg.game_password}</span>
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full uppercase font-bold',
                    cg.status === 'active'
                      ? 'bg-neon-green/20 text-neon-green border border-neon-green/30'
                      : 'bg-destructive/20 text-destructive border border-destructive/30'
                  )}
                >
                  {cg.status}
                </span>
              </div>
            ))}
            {customerGames.length === 0 && (
              <div className="col-span-full text-center py-6 text-muted-foreground text-xs">
                No game accounts linked yet. Use the form below to assign one.
              </div>
            )}
          </div>

          {/* Add new game form */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              const gameId = fd.get('game_id') as string
              const username = fd.get('username') as string
              const password = fd.get('password') as string
              if (!gameId || !username) return toast.error('Fill required fields')
              assignGameMutation.mutate({
                gameId,
                username,
                status: 'active',
                password,
              })
              e.currentTarget.reset()
            }}
            className="p-4 rounded-xl border border-white/10 bg-black/30 space-y-3"
          >
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              Assign New Game Account
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                name="game_id"
                className="game-input bg-black/40 text-xs"
                required
              >
                <option value="">-- Select Game --</option>
                {games?.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                name="username"
                placeholder="In-Game Username"
                className="game-input text-xs"
                required
              />
              <input
                type="text"
                name="password"
                placeholder="Game Password (default: aaa111)"
                className="game-input text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={assignGameMutation.isPending}
              className="btn-neon w-full py-2 text-xs font-bold"
            >
              {assignGameMutation.isPending ? 'Assigning...' : '+ Link Game Account'}
            </button>
          </form>
        </div>
      )}

      {/* Tab 5: Security & Settings */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Account Status Card */}
          <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Account Status & Access
            </h3>
            <p className="text-xs text-muted-foreground">
              Select the account status for this customer. Suspended or restricted users will be blocked from loading or placing cashouts.
            </p>
            <div className="flex flex-wrap gap-2">
              {['pending', 'active', 'suspended', 'restricted'].map((status) => (
                <button
                  key={status}
                  onClick={() => statusMutation.mutate(status)}
                  disabled={statusMutation.isPending}
                  className={cn(
                    'px-4 py-2 rounded-xl text-xs font-bold border transition-all capitalize',
                    c.account_status === status
                      ? 'border-primary bg-primary/20 text-primary shadow-[0_0_12px_rgba(0,212,255,0.3)]'
                      : 'border-border text-muted-foreground hover:border-primary/40 hover:text-white'
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Bonus Percentage Card */}
          <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-3">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <Percent className="h-4 w-4 text-neon-gold" /> Custom Bonus Percentage
            </h3>
            <p className="text-xs text-muted-foreground">
              Grant this player a permanent custom deposit bonus % on all their loads (leave blank or 0 for standard promotional rules).
            </p>
            <div className="flex items-center gap-3 max-w-xs">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                placeholder="e.g. 15"
                value={customBonus}
                onChange={(e) => setCustomBonus(e.target.value)}
                className="game-input text-xs"
              />
              <span className="text-xs text-muted-foreground">%</span>
              <button
                onClick={() => {
                  const val = parseFloat(customBonus)
                  bonusMutation.mutate(isNaN(val) ? 0 : val)
                }}
                disabled={bonusMutation.isPending}
                className="btn-neon px-4 py-2 text-xs"
              >
                Save
              </button>
            </div>
          </div>

          {/* Force Password Reset */}
          <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-3">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" /> Force Password Reset
            </h3>
            <p className="text-xs text-muted-foreground">
              Directly override and set a new password for this customer account.
            </p>
            <div className="flex items-center gap-3 max-w-md">
              <input
                type="text"
                placeholder="New Password (min 6 chars)"
                className="game-input text-xs flex-1"
                onChange={(e) => setNewPassword(e.target.value)}
                value={newPassword}
              />
              <button
                onClick={() => passwordMutation.mutate(newPassword)}
                className="btn-neon px-4 py-2 text-xs"
                disabled={
                  !newPassword ||
                  newPassword.length < 6 ||
                  passwordMutation.isPending
                }
              >
                {passwordMutation.isPending ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>

          {/* Public Live Ticker Visibility */}
          <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-3">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-neon-gold" /> Live Ticker Public Visibility
            </h3>
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 max-w-lg">
              <div>
                <p className="text-xs font-semibold text-white">
                  Hide player from public marquee & tickers?
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  When enabled, this customer's deposits and cashout wins will not appear on the homepage ticker.
                </p>
              </div>
              <button
                onClick={() =>
                  updateVisibilityMutation.mutate(!c.is_hidden_from_public)
                }
                disabled={updateVisibilityMutation.isPending}
                className={cn(
                  'w-12 h-6 rounded-full relative transition-colors shrink-0 ml-4',
                  c.is_hidden_from_public ? 'bg-primary' : 'bg-white/20'
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform',
                    c.is_hidden_from_public ? 'translate-x-6' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          </div>

          {/* Free Play Daily Limit Settings */}
          <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <Gift className="h-4 w-4 text-neon-gold" /> Customer Free Play Quota
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full border font-medium bg-white/5 border-white/10 text-muted-foreground">
                {c.custom_free_play_limit != null
                  ? c.custom_free_play_limit === 0
                    ? 'Restricted (0 / day)'
                    : `${c.custom_free_play_limit} / day (Custom)`
                  : 'Using Global Settings'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure whether this specific customer inherits the global system free play rules or has a custom daily limit.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
              <button
                type="button"
                onClick={() => setUseCustomFreePlay(false)}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all',
                  !useCustomFreePlay
                    ? 'bg-primary/10 border-primary shadow-[0_0_12px_rgba(0,212,255,0.2)]'
                    : 'bg-white/5 border-border hover:border-white/20'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">
                    Global Setting (Default)
                  </span>
                  {!useCustomFreePlay && (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Follows system-wide rules from Admin Settings
                </p>
              </button>

              <button
                type="button"
                onClick={() => setUseCustomFreePlay(true)}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all',
                  useCustomFreePlay
                    ? 'bg-neon-gold/10 border-neon-gold shadow-[0_0_12px_rgba(255,215,0,0.2)]'
                    : 'bg-white/5 border-border hover:border-white/20'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">
                    Custom Daily Limit
                  </span>
                  {useCustomFreePlay && (
                    <Check className="h-3.5 w-3.5 text-neon-gold" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Set unique daily quota for this player
                </p>
              </button>
            </div>

            {useCustomFreePlay && (
              <div className="p-4 rounded-xl border border-white/10 bg-black/30 space-y-2 max-w-lg">
                <label className="block text-xs font-medium text-white">
                  Daily Free Play Limit for this Customer
                </label>
                <div className="flex items-center gap-3 max-w-xs">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={customFpLimit}
                    onChange={(e) =>
                      setCustomFpLimit(
                        Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    className="game-input text-xs font-bold text-neon-gold"
                    placeholder="1"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    request(s) / day
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Tip: Set to <strong className="text-destructive">0</strong> to disable Free Play for this player.
                </p>
              </div>
            )}

            <div className="flex justify-start">
              <button
                onClick={() => {
                  const limitToSave = useCustomFreePlay ? customFpLimit : null
                  freePlayLimitMutation.mutate(limitToSave)
                }}
                disabled={freePlayLimitMutation.isPending}
                className="btn-neon px-5 py-2 text-xs flex items-center gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                {freePlayLimitMutation.isPending
                  ? 'Saving...'
                  : 'Save Free Play Settings'}
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="glass-card p-6 rounded-2xl border border-rose-500/30 bg-rose-500/5 space-y-4">
            <h3 className="font-semibold text-rose-400 text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Danger Zone
            </h3>
            <p className="text-xs text-muted-foreground">
              Permanently delete this customer account and all associated order history, cashout records, and linked in-game accounts. This action is irreversible.
            </p>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    'Are you absolutely sure you want to permanently delete this customer? This cannot be undone.'
                  )
                ) {
                  deleteMutation.mutate()
                }
              }}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Customer Account'}
            </button>
          </div>
        </div>
      )}

      {/* Log Load Modal */}
      <CreateOrderModal
        isOpen={isLogLoadOpen}
        onClose={() => setIsLogLoadOpen(false)}
        defaultUserId={id}
      />
    </div>
  )
}
