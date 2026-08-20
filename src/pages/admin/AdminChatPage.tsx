import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { fetchConversations, fetchMessages, sendMessage, closeConversation, uploadChatAttachment, deleteMessage, deleteConversation, clearConversationMessages } from '@/services/chat'
import { notifyNewMessage, requestNotificationPermission } from '@/hooks/useChatNotification'
import { MessageCircle, Send, X, User, Bell, Loader2, Trash2, Eraser, ChevronLeft } from 'lucide-react'
import { cn, formatTime } from '@/lib/utils'
import { useChatStore } from '@/stores/chatStore'

export default function AdminChatPage() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [notifEnabled, setNotifEnabled] = useState(typeof Notification !== 'undefined' && Notification.permission === 'granted')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastMsgCount = useRef<Record<string, number>>({})

  // Auto-request notification permission when admin opens the page
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      requestNotificationPermission().then(granted => setNotifEnabled(granted))
    }
  }, [])

  const { conversations } = useChatStore() // Use global conversations from layout

  const { data: fetchedMessages = [] } = useQuery({
    queryKey: ['messages', activeConvId],
    queryFn: () => fetchMessages(activeConvId!),
    enabled: !!activeConvId,
  })

  useEffect(() => {
    if ((fetchedMessages as any[]).length) setMessages(fetchedMessages as any[])
  }, [fetchedMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Poll active conversation messages every 3s + detect new messages
  useEffect(() => {
    if (!activeConvId) return
    const interval = setInterval(async () => {
      try {
        const msgs = await fetchMessages(activeConvId)
        const prev = lastMsgCount.current[activeConvId] ?? msgs.length
        const newMsgs = msgs.slice(prev)
        
        if (newMsgs.length > 0) {
          const hasGuestReply = newMsgs.some((msg: any) => msg.is_guest || (msg.sender_id && msg.sender_id !== profile?.id))
          if (hasGuestReply) {
            // We are actively looking at it, mark as read so global layout doesn't notify
            const { playNotificationSound } = await import('@/hooks/useChatNotification')
            playNotificationSound()
            const { markConversationAsRead } = await import('@/services/chat')
            await markConversationAsRead(activeConvId, 'admin')
          }
        }
        
        lastMsgCount.current[activeConvId] = msgs.length
        setMessages(msgs)
      } catch (err) {
        console.error(err)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [activeConvId, profile?.id])

  const closeMutation = useMutation({
    mutationFn: (convId: string) => closeConversation(convId),
    onSuccess: () => {
      setActiveConvId(null)
      setMessages([])
    }
  })

  const deleteMessageMutation = useMutation({
    mutationFn: (msgId: string) => deleteMessage(msgId),
    onSuccess: (_, deletedId) => {
      setMessages(prev => prev.filter(m => m.id !== deletedId))
      import('sonner').then(({ toast }) => toast.success('Message deleted'))
    },
    onError: (err) => {
      console.error(err)
      import('sonner').then(({ toast }) => toast.error('Failed to delete message (RLS Policy Issue?)'))
    }
  })

  const deleteConvMutation = useMutation({
    mutationFn: (convId: string) => deleteConversation(convId),
    onSuccess: () => {
      setActiveConvId(null)
      setMessages([])
      import('sonner').then(({ toast }) => toast.success('Conversation deleted'))
    },
    onError: (err) => {
      console.error(err)
      import('sonner').then(({ toast }) => toast.error('Failed to delete conversation (RLS Policy Issue?)'))
    }
  })

  const clearConvMutation = useMutation({
    mutationFn: (convId: string) => clearConversationMessages(convId),
    onSuccess: () => {
      setMessages([])
      import('sonner').then(({ toast }) => toast.success('Chat cleared'))
    },
    onError: (err) => {
      console.error(err)
      import('sonner').then(({ toast }) => toast.error('Failed to clear chat'))
    }
  })

  const handleSend = async () => {
    if ((!input.trim() && !attachment) || !activeConvId) return
    const content = input
    const currentAttachment = attachment
    setInput('')
    setAttachment(null)
    setUploading(true)

    try {
      let attachmentUrl = undefined
      if (currentAttachment) {
        attachmentUrl = await uploadChatAttachment(currentAttachment)
      }
      const msg = await sendMessage(activeConvId, profile!.id, content || 'Sent an attachment', false, false, 'admin', attachmentUrl)
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev
        return [...prev, msg]
      })
    } catch (err) {
      console.error(err)
      import('sonner').then(({ toast }) => toast.error('Failed to send message'))
      setInput(content)
      setAttachment(currentAttachment)
    } finally {
      setUploading(false)
    }
  }

  const handleEnableNotif = async () => {
    const granted = await requestNotificationPermission()
    setNotifEnabled(granted)
  }

  // Request permission on first interaction to bypass browser auto-block
  const handleFirstInteraction = () => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      requestNotificationPermission().then(granted => setNotifEnabled(granted))
    }
  }

  const activeConv = (conversations as any[]).find((c: any) => c.id === activeConvId)

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4" onClick={handleFirstInteraction}>
      {/* Conversations List */}
      <div className={cn("glass-card flex-col overflow-hidden w-full lg:w-80", activeConv ? "hidden lg:flex" : "flex")}>
        <div className="p-4 border-b border-border flex justify-between items-center bg-black/20">
          <h2 className="font-gaming font-bold text-white flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-neon-green" />
            Live Chat
          </h2>
          <button 
            onClick={handleEnableNotif}
            className={cn("p-1.5 rounded-md transition-colors", notifEnabled ? "text-neon-green bg-neon-green/10" : "text-muted-foreground hover:bg-white/5")}
            title={notifEnabled ? "Notifications enabled" : "Enable notifications"}
          >
            <Bell className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {(conversations as any[]).length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MessageCircle className="h-8 w-8 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No active chats</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {(conversations as any[]).map((conv: any) => (
                <button
                  key={conv.id}
                  onClick={async () => {
                    setActiveConvId(conv.id)
                    try {
                      const { markConversationAsRead } = await import('@/services/chat')
                      await markConversationAsRead(conv.id, 'admin')
                    } catch (err) {
                      console.error(err)
                    }
                  }}
                  className={cn(
                    'w-full flex flex-col p-4 border-b border-border text-left transition-colors relative',
                    activeConvId === conv.id ? 'bg-neon-green/10' : 'hover:bg-white/5'
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-white text-sm truncate pr-2">
                      {conv.guest_name || conv.customer?.full_name || 'Guest'}
                    </span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatTime(conv.last_message_at || conv.created_at)}
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-muted-foreground truncate pr-4">
                      {conv.last_message || conv.subject}
                    </span>
                    {conv.unread_count_agent > 0 && (
                      <span className="flex-shrink-0 h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-neon-green text-black text-[10px] font-bold">
                        {conv.unread_count_agent}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      {activeConv ? (
        <div className={cn("flex-1 glass-card flex-col overflow-hidden", activeConv ? "flex" : "hidden lg:flex")}>
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveConvId(null)}
                className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <p className="font-semibold text-white text-sm">
                  {activeConv.guest_name || activeConv.customer?.full_name || 'Guest'}
                  {activeConv.guest_name && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground bg-white/10 px-1.5 py-0.5 rounded">Guest</span>
                  )}
                  {activeConv.guest_contact && (
                    <span className="ml-2 text-xs font-normal text-neon-green">
                      ({activeConv.guest_contact})
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{activeConv.subject}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear all messages in this chat?')) {
                    clearConvMutation.mutate(activeConvId!)
                  }
                }} 
                className="btn-ghost-neon px-3 py-1.5 text-xs text-orange-500 hover:bg-orange-500/10"
              >
                <Eraser className="h-3.5 w-3.5" /> Clear Chat
              </button>
              <button 
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this entire conversation? All messages and files will be permanently deleted.')) {
                    deleteConvMutation.mutate(activeConvId!)
                  }
                }} 
                className="btn-ghost-neon px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
              <button onClick={() => closeMutation.mutate(activeConvId!)} className="btn-ghost-neon px-3 py-1.5 text-xs">
                <X className="h-3.5 w-3.5" /> Close
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg: any) => {
              const isAdmin = msg.sender_id !== activeConv.customer_id && !msg.is_guest
              return (
                <div key={msg.id} className={cn('flex group', isAdmin ? 'justify-end' : 'justify-start')}>
                  {!isAdmin && (
                    <button 
                      onClick={() => deleteMessageMutation.mutate(msg.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity mr-2 self-center p-1.5 text-muted-foreground hover:text-destructive"
                      title="Delete message"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <div className={isAdmin ? 'chat-bubble-agent' : 'chat-bubble-customer'}>
                    {msg.attachment_url && (
                      <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block mb-2">
                        <img src={msg.attachment_url} alt="Attachment" className="max-w-full rounded-lg object-cover" style={{ maxHeight: '200px' }} />
                      </a>
                    )}
                    {msg.content !== 'Sent an attachment' && <p>{msg.content}</p>}
                    <p className="text-[10px] opacity-60 mt-0.5">{formatTime(msg.created_at)}</p>
                  </div>
                  {isAdmin && (
                    <button 
                      onClick={() => deleteMessageMutation.mutate(msg.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 self-center p-1.5 text-muted-foreground hover:text-destructive"
                      title="Delete message"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
          <div className="border-t border-border p-3 flex flex-col gap-2">
            {uploading && (
              <div className="flex items-center gap-2 px-2 text-xs text-neon-green">
                <Loader2 className="h-3 w-3 animate-spin" /> Uploading image...
              </div>
            )}
            {attachment && (
              <div className="relative w-fit ml-2">
                <img src={URL.createObjectURL(attachment)} alt="Attachment" className="h-16 w-16 object-cover rounded border border-border" />
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive flex items-center justify-center text-white hover:scale-110"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <label className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-white transition-colors flex-shrink-0">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      if (file.size > 2 * 1024 * 1024) {
                        import('sonner').then(({ toast }) => toast.error('Image must be less than 2MB'))
                        return
                      }
                      setAttachment(file)
                    }
                  }}
                />
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              </label>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Reply..."
                className="game-input flex-1"
              />
              <button onClick={handleSend} disabled={(!input.trim() && !attachment) || uploading} className="btn-neon px-4 py-2.5">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 glass-card flex items-center justify-center">
          <div className="text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Select a conversation</p>
          </div>
        </div>
      )}
    </div>
  )
}
