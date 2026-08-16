import { supabase } from '@/lib/supabase'
import type { Notification } from '@/types'

export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data || []
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
  if (error) throw error
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
  if (error) throw error
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function sendNotificationToUser(
  userId: string,
  title: string,
  message: string,
  category: Notification['category'] = 'system',
  actionUrl?: string
): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    title,
    message,
    category,
    action_url: actionUrl || null,
  })
  if (error) throw error
}
