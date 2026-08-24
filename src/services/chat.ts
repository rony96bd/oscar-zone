import { supabase } from '@/lib/supabase'
import type { ChatConversation, ChatMessage } from '@/types'

export async function fetchConversations(
  userId: string,
  role: 'customer' | 'admin'
): Promise<ChatConversation[]> {
  if (role === 'admin') {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*, customer:profiles!customer_id(*)')
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
    if (error) { console.error('fetchConversations admin error:', error); throw error }
    return data || []
  }

  const { data, error } = await supabase
    .from('chat_conversations')
    .select('*, customer:profiles!customer_id(*)')
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
  senderRole: 'admin' | 'customer' | 'guest' = 'customer',
  attachmentUrl?: string
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      is_guest: isGuest,
      content,
      attachment_url: attachmentUrl || null,
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

  const { error: updateError } = await supabase
    .from('chat_conversations')
    .update(updates)
    .eq('id', conversationId)
    
  if (updateError) {
    console.error('Failed to update conversation unread counts:', updateError)
  }

  // If admin sends a message, trigger push notification to the customer
  if (senderRole === 'admin' && conv) {
    // We need the customer_id to send the notification
    const { data: convData } = await supabase
      .from('chat_conversations')
      .select('customer_id')
      .eq('id', conversationId)
      .single()
      
    if (convData?.customer_id) {
      supabase.functions.invoke('send-web-push', {
        body: {
          userId: convData.customer_id,
          title: 'New Reply from Support',
          body: content.length > 50 ? content.slice(0, 50) + '...' : content,
          url: '/chat'
        }
      }).catch(err => console.error('Failed to send push notification', err))
    }
  } else if ((senderRole === 'customer' || senderRole === 'guest') && !isInternalNote) {
    // Notify admin via Telegram
    const { data: convData, error: convError } = await supabase
      .from('chat_conversations')
      .select('guest_name, customer_id, customer:profiles!customer_id(full_name, username)')
      .eq('id', conversationId)
      .single()
      
    if (convError) {
      console.error('Failed to fetch conversation for telegram notification:', convError)
    }

    let customerName = 'Unknown'
    if (isGuest) {
      customerName = convData?.guest_name || 'Guest'
    } else if (convData?.customer) {
      // @ts-ignore
      customerName = convData.customer.full_name || convData.customer.username || 'Customer'
    }

    const originUrl = typeof window !== 'undefined' ? window.location.origin : ''

    supabase.functions.invoke('notify-telegram', {
      body: {
        customerName,
        message: content,
        isGuest,
        conversationId,
        originUrl
      }
    }).catch(err => console.error('Failed to send telegram notification', err))
  }

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

export async function uploadChatAttachment(file: File): Promise<string> {
  if (file.size > 2 * 1024 * 1024) throw new Error('File size must be less than 2MB')
  if (!file.type.startsWith('image/')) throw new Error('Only images are allowed')

  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
  
  const { error: uploadError } = await supabase.storage
    .from('chat_attachments')
    .upload(fileName, file)
    
  if (uploadError) throw uploadError
  
  const { data } = supabase.storage
    .from('chat_attachments')
    .getPublicUrl(fileName)
    
  return data.publicUrl
}

export async function deleteMessage(messageId: string): Promise<void> {
  // First fetch the message to get attachment URL
  const { data: msg } = await supabase
    .from('chat_messages')
    .select('attachment_url')
    .eq('id', messageId)
    .single()
    
  if (msg?.attachment_url) {
    const urlParts = msg.attachment_url.split('/')
    const fileName = urlParts[urlParts.length - 1]
    if (fileName) {
      await supabase.storage.from('chat_attachments').remove([fileName])
    }
  }
  
  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('id', messageId)
    
  if (error) throw error
}

export async function deleteConversation(conversationId: string): Promise<void> {
  // Fetch all messages with attachments
  const { data: msgs } = await supabase
    .from('chat_messages')
    .select('attachment_url')
    .eq('conversation_id', conversationId)
    .not('attachment_url', 'is', null)
    
  if (msgs && msgs.length > 0) {
    const filesToRemove = msgs
      .map(m => {
        const parts = m.attachment_url?.split('/')
        return parts ? parts[parts.length - 1] : null
      })
      .filter((f): f is string => Boolean(f))
      
    if (filesToRemove.length > 0) {
      await supabase.storage.from('chat_attachments').remove(filesToRemove)
    }
  }
  
  // Delete the conversation (will cascade delete messages in DB)
  const { error } = await supabase
    .from('chat_conversations')
    .delete()
    .eq('id', conversationId)
    
  if (error) throw error
}

export async function clearConversationMessages(conversationId: string): Promise<void> {
  // Fetch all messages with attachments
  const { data: msgs } = await supabase
    .from('chat_messages')
    .select('attachment_url')
    .eq('conversation_id', conversationId)
    .not('attachment_url', 'is', null)
    
  if (msgs && msgs.length > 0) {
    const filesToRemove = msgs
      .map(m => {
        const parts = m.attachment_url?.split('/')
        return parts ? parts[parts.length - 1] : null
      })
      .filter((f): f is string => Boolean(f))
      
    if (filesToRemove.length > 0) {
      await supabase.storage.from('chat_attachments').remove(filesToRemove)
    }
  }
  
  // Delete only the messages
  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('conversation_id', conversationId)
    
  if (error) throw error
  
  // Reset last message info in conversation
  await supabase
    .from('chat_conversations')
    .update({ 
      last_message: null,
      last_message_at: null,
      unread_count_agent: 0,
      unread_count_customer: 0
    })
    .eq('id', conversationId)
}

export async function assignAgent(conversationId: string, agentId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_conversations')
    .update({ assigned_agent_id: agentId })
    .eq('id', conversationId)
  if (error) throw error
}
