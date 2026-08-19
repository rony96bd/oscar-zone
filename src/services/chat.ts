import { supabase } from '@/lib/supabase'
import type { ChatConversation, ChatMessage } from '@/types'

export async function fetchConversations(
  userId: string,
  role: 'customer' | 'admin'
): Promise<ChatConversation[]> {
  if (role === 'admin') {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
    if (error) { console.error('fetchConversations admin error:', error); throw error }
    return data || []
  }

  const { data, error } = await supabase
    .from('chat_conversations')
    .select('*')
    .eq('customer_id', userId)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createConversation(
  customerId: string,
  subject?: string
): Promise<ChatConversation> {
  const { data, error } = await supabase
    .from('chat_conversations')
    .insert({
      customer_id: customerId,
      subject: subject || 'Support Request',
      status: 'open',
    })
    .select('*, customer:profiles!customer_id(*)')
    .single()
  if (error) throw error
  return data
}

export async function createGuestConversation(
  guestSessionId: string,
  guestName: string,
  guestContact: string | null
): Promise<ChatConversation> {
  const { data, error } = await supabase
    .from('chat_conversations')
    .insert({
      guest_session_id: guestSessionId,
      guest_name: guestName,
      guest_contact: guestContact,
      status: 'open',
      subject: 'Guest Inquiry',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchGuestConversation(
  guestSessionId: string
): Promise<ChatConversation | null> {
  // Using the secure RPC function to fetch conversation by session ID
  const { data, error } = await supabase
    .rpc('get_guest_conversation', { p_session_id: guestSessionId })
    .single()
  if (error) return null
  return data as ChatConversation | null
}

export async function sendMessage(
  conversationId: string,
  senderId: string | null,
  content: string,
  isInternalNote = false,
  isGuest = false,
  senderRole: 'admin' | 'customer' | 'guest' = 'customer'
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      is_guest: isGuest,
      content,
      is_internal_note: isInternalNote,
    })
    .select()
    .single()
  if (error) throw error

  // Fetch current conversation to update unread counts
  const { data: conv } = await supabase
    .from('chat_conversations')
    .select('unread_count_agent, unread_count_customer')
    .eq('id', conversationId)
    .single()

  const updates: any = {
    last_message: content.slice(0, 100),
    last_message_at: new Date().toISOString(),
  }

  if (conv) {
    if (senderRole === 'admin') {
      updates.unread_count_customer = (conv.unread_count_customer || 0) + 1
    } else {
      updates.unread_count_agent = (conv.unread_count_agent || 0) + 1
    }
  }

  await supabase
    .from('chat_conversations')
    .update(updates)
    .eq('id', conversationId)

  return data
}

export async function markConversationAsRead(
  conversationId: string,
  role: 'admin' | 'customer'
): Promise<void> {
  const updates = role === 'admin' 
    ? { unread_count_agent: 0 } 
    : { unread_count_customer: 0 }
    
  await supabase
    .from('chat_conversations')
    .update(updates)
    .eq('id', conversationId)
}

export async function closeConversation(conversationId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_conversations')
    .update({ status: 'closed' })
    .eq('id', conversationId)
  if (error) throw error
}

export async function assignAgent(conversationId: string, agentId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_conversations')
    .update({ assigned_agent_id: agentId })
    .eq('id', conversationId)
  if (error) throw error
}
