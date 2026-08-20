import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { toast } from 'sonner'
import type { Notification, ChatMessage } from '@/types'

const playNotificationSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    if (audioCtx.state === 'suspended') audioCtx.resume()
    const oscillator = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioCtx.destination)
    
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime) // A5
    oscillator.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1) // A6
    
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1)
    
    oscillator.start(audioCtx.currentTime)
    oscillator.stop(audioCtx.currentTime + 0.1)
  } catch (e) {
    console.warn('Audio play failed', e)
  }
}

const showBrowserNotification = (title: string, body: string) => {
  if (!("Notification" in window)) return

  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: '/favicon.ico' })
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        new Notification(title, { body, icon: '/favicon.ico' })
      }
    })
  }
}

export function useRealtimeNotifications() {
  const { profile } = useAuthStore()
  const { addNotification } = useNotificationStore()

  useEffect(() => {
    // Request permission early if not determined
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {})
    }

    if (!profile?.id) return

    const channel = supabase
      .channel(`notifications:${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const notif = payload.new as Notification
          addNotification(notif)
          
          // Show in-app toast
          toast(notif.title, { description: notif.message })
          
          // Play sound
          playNotificationSound()
          
          // Show Browser Push Notification
          showBrowserNotification(notif.title, notif.message)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile?.id, addNotification])
}

export function useRealtimeChat(
  conversationId: string,
  onMessage: (msg: ChatMessage) => void
) {
  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          onMessage(payload.new as ChatMessage)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId, onMessage])
}

export function useRealtimeOrders(
  userId: string | null,
  onOrderUpdate: (order: any) => void
) {
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`orders:${userId}`)
      .on(
         'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onOrderUpdate(payload.new)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, onOrderUpdate])
}
