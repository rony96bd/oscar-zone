import { supabase } from '@/lib/supabase'
import type { ChatConversation, ChatMessage } from '@/types'

export async function fetchConversations(
  userId: string,
  role: 'customer' | 'admin'
): Promise<ChatConversation[]> {
  let query = supabase
    .from('chat_conversations')
    .select('*, customer:profiles!customer_id(*), assigned_agent:profiles!assigned_agent_id(*)')
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (role === 'customer') {
    query = query.eq('customer_id', userId)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*, sender:profiles!sender_id(*)')
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

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  isInternalNote = false
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
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
