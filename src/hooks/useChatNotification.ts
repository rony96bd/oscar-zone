/**
 * useChatNotification
 * Handles browser push notification + sound for chat messages.
 */

import { supabase } from '@/lib/supabase'

const PUBLIC_VAPID_KEY = 'BH-7x7Eicf0gzqisySTLZqCYGo6KSllYg-WxyGX3FkkQ8tkF11Kbj7RlA65xjb4Eyew6C7Ce-TTxE7PiXQbuIbs'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Request browser notification permission and subscribe to Web Push
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') {
    await subscribeToWebPush()
    return true
  }
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  if (result === 'granted') {
    await subscribeToWebPush()
    return true
  }
  return false
}

async function subscribeToWebPush() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !('serviceWorker' in navigator) || !('PushManager' in window)) return

    const registration = await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()
    
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
      })
    }

    // Save to database
    const { error } = await supabase.from('push_subscriptions').upsert(
      { 
        user_id: user.id, 
        endpoint: subscription.endpoint,
        subscription: JSON.parse(JSON.stringify(subscription)) 
      },
      { onConflict: 'endpoint' }
    )
    if (error) {
      console.error('Failed to save push subscription to DB:', error)
    } else {
      console.log('Web Push Subscription saved successfully')
    }
  } catch (err) {
    console.error('Failed to subscribe to Web Push', err)
  }
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
export async function showBrowserNotification(title: string, body: string, icon?: string) {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  
  const options = {
    body,
    icon: icon || '/pwa-192x192.png',
    badge: '/favicon.svg',
    tag: 'chat-message',
  }

  try {
    // Mobile browsers often require notifications to be spawned from a Service Worker
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready
      if (registration) {
        await registration.showNotification(title, options)
        return
      }
    }
    // Fallback for desktop browsers
    new Notification(title, options)
  } catch (err) {
    console.error('Notification error:', err)
  }
}

// Combined: play sound + show browser notification + toast
export function notifyNewMessage(title: string, body: string) {
  playNotificationSound()
  showBrowserNotification(title, body)
  
  // Show in-app toast for guaranteed visibility
  import('sonner').then(({ toast }) => {
    toast(title, {
      id: body.substring(0, 50), // prevent duplicates
      description: body,
      duration: 5000,
      position: 'top-right',
    })
  })
}
