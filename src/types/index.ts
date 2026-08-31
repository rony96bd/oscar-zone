export type UserRole = 'customer' | 'admin' | 'super_admin' | 'support_agent'
export type AccountStatus = 'active' | 'suspended' | 'restricted' | 'pending'

export type StaffPermissionKey =
  | 'view_orders'
  | 'manage_orders'
  | 'view_cashout'
  | 'manage_cashout'
  | 'view_customers'
  | 'manage_customers'
  | 'view_chat'
  | 'view_games'
  | 'manage_games'
  | 'view_free_plays'
  | 'manage_free_plays'
  | 'view_reports'
  | 'send_notifications'
  | 'manage_testimonials'

export type StaffPermissions = Partial<Record<StaffPermissionKey, boolean>>
export type OrderStatus =
  | 'pending_payment_review'
  | 'payment_verified'
  | 'processing'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'refunded'

export type PromotionType =
  | 'regular'
  | 'daily'
  | 'first_load'
  | 'weekend'
  | 'vip'
  | 'game_specific'
  | 'customer_specific'

export type BannerType = 'homepage' | 'promotion' | 'game' | 'referral' | 'announcement'

export interface Banner {
  id: string
  title: string
  image_url: string
  link_url: string | null
  type: BannerType
  sort_order: number
  is_active: boolean
  start_date: string | null
  end_date: string | null
  created_at: string
}

export interface Announcement {
  id: string
  title: string
  message: string
  banner_url: string | null
  priority: number
  is_active: boolean
  start_date: string | null
  end_date: string | null
  created_at: string
}

export interface Profile {
  id: string
  email?: string
  full_name?: string
  phone?: string
  username?: string
  telegram?: string
  avatar_url?: string | null
  role: UserRole
  account_status: AccountStatus
  referral_code: string
  referred_by: string | null
  is_vip: boolean
  custom_bonus_percentage: number | null
  notes: string | null
  last_login: string | null
  permissions: StaffPermissions
  created_at: string
  updated_at: string
}

export interface Game {
  id: string
  name: string
  slug: string
  logo_url: string | null
  banner_url: string | null
  description: string | null
  download_url: string | null
  play_now_url: string | null
  is_active: boolean
  minimum_amount: number
  maximum_amount: number
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CustomerGame {
  id: string
  customer_id: string
  game_id: string
  username: string
  game_password?: string
  game_user_id: string | null
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
  game?: Game
  profile?: Profile
}

export interface PaymentMethod {
  id: string
  name: string
  logo_url: string | null
  qr_code_url: string | null
  tag: string | null
  payment_link: string | null
  account_name: string | null
  instructions: string | null
  minimum_amount: number
  maximum_amount: number
  agent_commission_rate: number
  is_active: boolean
  is_agent: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Promotion {
  id: string
  name: string
  description: string | null
  banner_url: string | null
  type: PromotionType
  bonus_percentage: number
  minimum_amount: number
  maximum_amount: number | null
  start_date: string | null
  end_date: string | null
  start_time: string | null
  end_time: string | null
  usage_limit: number | null
  usage_count: number
  per_user_limit: number | null
  is_once_per_day: boolean
  applicable_game_ids: string[] | null
  applicable_customer_ids: string[] | null
  is_vip_only: boolean
  priority: number
  is_active: boolean
  is_pinned: boolean
  pin_text: string | null
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  order_number: string
  user_id: string | null
  customer_game_id: string | null
  game_id: string
  username: string
  base_amount: number
  regular_bonus_pct: number
  regular_bonus_amount: number
  promo_bonus_pct: number
  promo_bonus_amount: number
  total_bonus_amount: number
  final_game_credit: number
  payment_method_id: string
  payment_screenshot_path: string | null
  customer_payment_tag: string | null
  status: OrderStatus
  assigned_agent_id: string | null
  admin_note: string | null
  rejection_reason: string | null
  promotion_id: string | null
  is_guest: boolean
  guest_name: string | null
  guest_email: string | null
  guest_phone: string | null
  created_at: string
  updated_at: string
  // Joined
  game?: Game
  payment_method?: PaymentMethod
  profile?: Profile
  bonus_snapshot?: OrderBonusSnapshot
  status_history?: OrderStatusHistory[]
}

export interface OrderBonusSnapshot {
  id: string
  order_id: string
  base_amount: number
  regular_bonus_pct: number
  regular_bonus_amount: number
  promotion_name: string | null
  promo_bonus_pct: number
  promo_bonus_amount: number
  total_bonus_amount: number
  final_game_credit: number
  bonus_rule_applied: string | null
  snapshot_data: Record<string, unknown>
  created_at: string
}

export interface OrderStatusHistory {
  id: string
  order_id: string
  status: string
  changed_by: string | null
  note: string | null
  created_at: string
  changed_by_profile?: Profile
}

export interface ReferralLevel {
  id: string
  level: number
  min_referrals: number
  max_referrals: number | null
  commission_percentage: number
  label: string
  created_at: string
}

export interface Referral {
  id: string
  referrer_id: string
  referred_id: string
  status: 'pending' | 'qualified' | 'disqualified'
  qualified_at: string | null
  created_at: string
  referred?: Profile
}

export interface ReferralEarning {
  id: string
  user_id: string
  referral_id: string
  source_order_id: string
  deposit_amount: number
  commission_percentage: number
  commission_amount: number
  level: number
  status: 'pending' | 'paid' | 'cancelled'
  created_at: string
  referral?: Referral
  source_order?: Order
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  category: 'orders' | 'promotions' | 'referral' | 'support' | 'system'
  is_read: boolean
  action_url: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface ChatConversation {
  id: string
  customer_id: string | null
  guest_session_id: string | null
  guest_name: string | null
  guest_contact: string | null
  assigned_agent_id: string | null
  status: 'open' | 'closed' | 'pending'
  subject: string | null
  last_message: string | null
  last_message_at: string | null
  unread_count_customer: number
  unread_count_agent: number
  created_at: string
  updated_at: string
  customer?: Profile
  assigned_agent?: Profile
}

export interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string | null
  is_guest: boolean
  content: string
  attachment_url?: string
  is_internal_note: boolean
  is_read: boolean
  created_at: string
  sender?: Profile
}

export interface CreateOrderPayload {
  game_id: string
  username: string
  base_amount: number
  payment_method_id: string
  payment_screenshot_path: string
  customer_game_id?: string
  promotion_id?: string
  guest_name?: string
  guest_email?: string
  guest_phone?: string
}

export interface AdminStats {
  today_orders: number
  today_revenue: number
  pending_orders: number
  total_customers: number
  total_revenue_month: number
  recent_orders: Order[]
}

export interface ReferralStats {
  total_referrals: number
  qualified_referrals: number
  pending_referrals: number
  total_earnings: number
  pending_earnings: number
  current_level: number
  current_commission_pct: number
}

export interface AccountingCycle {
  id: string
  start_date: string
  end_date: string | null
  total_deposits: number
  total_cashouts: number
  total_agent_commissions: number
  total_game_points_cost: number
  net_profit: number
  status: 'active' | 'closed'
  created_at: string
  closed_by: string | null
  closed_by_profile?: {
    full_name: string | null
  }
}

export interface GamePointPurchase {
  id: string
  game_id: string
  amount: number
  created_at: string
  created_by: string | null
  game?: Game
  profile?: Profile
}

export interface FreePlayRequest {
  id: string
  user_id: string
  game_id: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  profile?: Profile
  game?: Game
}

export interface Testimonial {
  id: string
  user_id: string
  cashout_request_id?: string
  game_name: string
  amount: number
  message: string
  status: 'pending' | 'approved' | 'rejected'
  reward_claimed: boolean
  created_at: string
  updated_at: string
  profiles?: {
    username: string
    full_name: string
  }
}

export interface LiveActivity {
  activity_type: 'load' | 'cashout'
  amount: number
  game_name: string
  masked_name: string
  created_at: string
}

