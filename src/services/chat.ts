import { supabase } from '@/lib/supabase'
import type { ChatConversation, ChatMessage } from '@/types'

export async function fetchConversations(
  userId: string,
  role: 'customer' | 'admin'
): Promise<ChatConversation[]> {
  if (role === 'admin') {
    // Admin sees ALL conversations including guest ones
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*, customer:profiles!left(id, full_name, username, avatar_url), assigned_agent:profiles!assigned_agent_id(id, full_name)')
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }

  // Customer sees only their own conversations
  const { data, error } = await supabase
    .from('chat_conversations')
    .select('*, customer:profiles!left(id, full_name, username, avatar_url), assigned_agent:profiles!assigned_agent_id(id, full_name)')
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
  isGuest = false
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

  // Update conversation last_message
  await supabase
    .from('chat_conversations')
    .update({
      last_message: content.slice(0, 100),
      last_message_at: new Date().toISOString(),
    })
    .eq('id', conversationId)

  return data
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
