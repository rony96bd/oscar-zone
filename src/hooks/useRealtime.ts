import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import type { Notification, ChatMessage } from '@/types'

export function useRealtimeNotifications() {
  const { profile } = useAuthStore()
  const { addNotification } = useNotificationStore()

  useEffect(() => {
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
          addNotification(payload.new as Notification)
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
