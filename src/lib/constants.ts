export const APP_NAME = import.meta.env.VITE_APP_NAME || 'GameZone'
export const APP_TAGLINE = import.meta.env.VITE_APP_TAGLINE || 'Top Up. Play More. Win Big.'
export const APP_DESCRIPTION = import.meta.env.VITE_APP_DESCRIPTION || 'The #1 trusted game loading service.'

export const SUPPORT_EMAIL = import.meta.env.VITE_DEFAULT_SUPPORT_EMAIL || ''
export const SUPPORT_PHONE = ''
export const SUPPORT_TELEGRAM = import.meta.env.VITE_DEFAULT_SUPPORT_TELEGRAM || ''
export const SUPPORT_FACEBOOK = import.meta.env.VITE_DEFAULT_SUPPORT_FACEBOOK || ''

export const SCREENSHOT_BUCKET = 'payment-screenshots'
export const AVATAR_BUCKET = 'avatars'
export const GAME_ASSETS_BUCKET = 'game-assets'
export const BANNER_BUCKET = 'banners'

export const ORDERS_PAGE_SIZE = 20
export const NOTIFICATIONS_PAGE_SIZE = 50

export const MAX_SCREENSHOT_SIZE = 10 * 1024 * 1024 // 10MB
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const GAMES = [
  {
    name: 'Juwa',
    slug: 'juwa',
    downloadUrl: 'http://dl.juwa777.com/',
    description: 'One of the most popular sweepstakes fish games in the US.',
  },
  {
    name: 'Orion Stars',
    slug: 'orion-stars',
    downloadUrl: 'http://orionstars.vip:8580/index.html',
    description: 'Exciting universe of fish table games and slots.',
  },
  {
    name: 'Firekirin',
    slug: 'firekirin',
    downloadUrl: 'http://firekirin.xyz:8580/index.html',
    description: 'Legendary fish game platform with huge jackpots.',
  },
  {
    name: 'Milkyway',
    slug: 'milkyway',
    downloadUrl: 'https://milkywayapp.xyz/',
    description: 'Premium fish table games and slots.',
  },
  {
    name: 'Game Vault',
    slug: 'game-vault',
    downloadUrl: 'http://download.gamevault999.com',
    description: 'The ultimate sweepstakes gaming platform with 100+ games.',
  },
  {
    name: 'Game Room',
    slug: 'game-room',
    downloadUrl: 'https://www.gameroom777.com/m',
    description: 'Best fish table experience with generous bonuses.',
  },
  {
    name: 'Cash Frenzy',
    slug: 'cash-frenzy',
    downloadUrl: 'https://www.cashfrenzy777.com/',
    description: 'Non-stop slot action with massive coin rewards.',
  },
]

export const PAYMENT_METHODS = [
  {
    name: 'Chime',
    tag: '$YourChimeTag',
    description: 'Send via Chime Pay Friends',
  },
  {
    name: 'PayPal',
    tag: '@OscarZoneGaming',
    description: 'Send as Friends & Family ONLY',
  },
  {
    name: 'Cash App',
    tag: '$OscarZone',
    description: 'Send via Cash App',
  },
]

export const ORDER_STATUSES = [
  { value: 'pending_payment_review', label: 'Pending Review' },
  { value: 'payment_verified', label: 'Payment Verified' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
]
