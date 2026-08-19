/**
 * useChatNotification
 * Handles browser push notification + sound for chat messages.
 */

// Request browser notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

// Play a soft notification beep
export function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.2)
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.4)
  } catch {
    // AudioContext not available – silent fail
  }
}

// Show a browser push notification
export function showBrowserNotification(title: string, body: string, icon?: string) {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    new Notification(title, {
      body,
      icon: icon || '/favicon.svg',
      badge: '/favicon.svg',
      tag: 'chat-message',
    })
  } catch {
    // Silently fail
  }
}

// Combined: play sound + show browser notification + toast
export function notifyNewMessage(title: string, body: string) {
  playNotificationSound()
  showBrowserNotification(title, body)
  
  // Show in-app toast for guaranteed visibility
  import('sonner').then(({ toast }) => {
    toast(title, {
      description: body,
      duration: 5000,
      position: 'top-right',
    })
  })
}
