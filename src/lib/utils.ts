import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  // In Tailwind v4, twMerge is less critical, but we keep it for safety
  return clsx(inputs)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateString.replace(' ', 'T')))
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(dateString.replace(' ', 'T')))
}

export function formatTime(dateString: string): string {
  if (!dateString) return '';
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(dateString.replace(' ', 'T')))
}

export function formatRelativeTime(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString.replace(' ', 'T'))
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(dateString)
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function generateReferralUrl(code: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://oscarzone.com'
  return `${base}/register?ref=${code}`
}

export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }
}

export function getOrderStatusClass(status: string): string {
  const classes: Record<string, string> = {
    pending_payment_review: 'badge-pending',
    payment_verified: 'badge-verified',
    processing: 'badge-processing',
    completed: 'badge-completed',
    rejected: 'badge-rejected',
    cancelled: 'badge-rejected',
    refunded: 'badge-refunded',
  }
  return classes[status] || 'badge-pending'
}

export function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending_payment_review: 'Pending',
    completed: 'Approve',
    rejected: 'Reject',
    payment_verified: 'Payment Verified',
    processing: 'Processing',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
  }
  return labels[status] || status
}

export function truncate(str: string, length = 50): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
