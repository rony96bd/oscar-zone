import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { fetchConversations, fetchMessages, sendMessage, closeConversation } from '@/services/chat'
import { notifyNewMessage, requestNotificationPermission } from '@/hooks/useChatNotification'
import { MessageCircle, Send, X, User, Bell } from 'lucide-react'
import { cn, formatTime } from '@/lib/utils'

export default function AdminChatPage() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [notifEnabled, setNotifEnabled] = useState(Notification.permission === 'granted')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastMsgCount = useRef<Record<string, number>>({})

  // Auto-request notification permission when admin opens the page
  useEffect(() => {
    if (Notification.permission === 'default') {
      requestNotificationPermission().then(granted => setNotifEnabled(granted))
    }
  }, [])

  const { data: conversations = [] } = useQuery({
    queryKey: ['admin-conversations'],
    queryFn: () => fetchConversations(profile!.id, 'admin'),
    enabled: !!profile?.id,
    refetchInterval: 5000, // Poll conversations list every 5s
  })

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
        // Notify admin if new message from guest/customer
        newMsgs.forEach((msg: any) => {
          if (msg.is_guest || (msg.sender_id && msg.sender_id !== profile?.id)) {
            notifyNewMessage('New Message', msg.content?.slice(0, 80) || 'New chat message')
          }
        })
        lastMsgCount.current[activeConvId] = msgs.length
        setMessages(msgs)
      } catch (err) {
        console.error(err)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [activeConvId, profile?.id])

  // Poll ALL conversations every 5s to detect new incoming chats
  useEffect(() => {
    if (!profile?.id) return
    const interval = setInterval(async () => {
      try {
        const convs = await fetchConversations(profile.id, 'admin')
        convs.forEach((conv: any) => {
          if (conv.id !== activeConvId && conv.unread_count_agent > 0) {
            // New message in background conversation
            const name = conv.guest_name || conv.customer?.full_name || 'Guest'
            notifyNewMessage(`New message from ${name}`, conv.last_message || 'New chat message')
          }
        })
        queryClient.setQueryData(['admin-conversations'], convs)
      } catch (err) {
        console.error(err)
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [profile?.id, activeConvId, queryClient])

  const sendMutation = useMutation({
    mutationFn: (content: string) => sendMessage(activeConvId!, profile!.id, content),
    onSuccess: (msg: any) => setMessages(prev => [...prev, msg]),
  })

  const closeMutation = useMutation({
    mutationFn: (convId: string) => closeConversation(convId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-conversations'] })
      setActiveConvId(null)
      setMessages([])
    }
  })

  const handleSend = () => {
    if (!input.trim() || !activeConvId) return
    sendMutation.mutate(input.trim())
    setInput('')
  }

  const handleEnableNotif = async () => {
    const granted = await requestNotificationPermission()
    setNotifEnabled(granted)
  }

  // Request permission on first interaction to bypass browser auto-block
  const handleFirstInteraction = () => {
    if (Notification.permission === 'default') {
      handleEnableNotif()
    }
  }

  const activeConv = (conversations as any[]).find((c: any) => c.id === activeConvId)

  return (
    <div className="flex gap-4 h-[calc(100vh-9rem)]" onClick={handleFirstInteraction}>
      {/* Conversations List */}
      <div className="w-64 flex-shrink-0 glass-card flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-gaming font-bold text-white text-sm">Live Chat</h2>
              <p className="text-xs text-muted-foreground">
                {(conversations as any[]).filter((c: any) => c.status === 'open').length} open
              </p>
            </div>
            {!notifEnabled && (
              <button
                onClick={handleEnableNotif}
                title="Enable notifications"
                className="flex items-center gap-1 text-[10px] text-neon-gold hover:text-white transition-colors"
              >
                <Bell className="h-3.5 w-3.5" />
                Enable
              </button>
            )}
            {notifEnabled && (
              <Bell className="h-3.5 w-3.5 text-neon-green" />
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {(conversations as any[]).length === 0 && (
            <p className="text-xs text-muted-foreground p-4 text-center">No conversations yet</p>
          )}
          {(conversations as any[]).map((conv: any) => (
            <button
              key={conv.id}
              onClick={() => {
                setActiveConvId(conv.id)
                lastMsgCount.current[conv.id] = 0 // reset counter on open
              }}
              className={cn(
                'w-full p-3 text-left hover:bg-muted/30 transition-colors border-b border-border',
                activeConvId === conv.id && 'bg-primary/10'
              )}
            >
              <div className="flex items-center gap-2">
                <div className="relative h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <User className="h-3.5 w-3.5 text-primary" />
                  {conv.unread_count_agent > 0 && (
                    <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-destructive text-[9px] text-white flex items-center justify-center">
                      {conv.unread_count_agent}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-semibold text-white truncate">
                      {conv.guest_name || conv.customer?.full_name || 'Guest'}
                    </p>
                    {conv.guest_name && (
                      <span className="text-[9px] text-muted-foreground bg-white/10 px-1 rounded">Guest</span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{conv.last_message || conv.subject}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Window */}
      {activeConv ? (
        <div className="flex-1 glass-card flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
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
            <button onClick={() => closeMutation.mutate(activeConvId!)} className="btn-ghost-neon px-3 py-1.5 text-xs">
              <X className="h-3.5 w-3.5" /> Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg: any) => {
              const isAdmin = msg.sender_id !== activeConv.customer_id && !msg.is_guest
              return (
                <div key={msg.id} className={cn('flex', isAdmin ? 'justify-end' : 'justify-start')}>
                  <div className={isAdmin ? 'chat-bubble-agent' : 'chat-bubble-customer'}>
                    <p>{msg.content}</p>
                    <p className="text-[10px] opacity-60 mt-0.5">{formatTime(msg.created_at)}</p>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
          <div className="border-t border-border p-3 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Reply..."
              className="game-input flex-1"
            />
            <button onClick={handleSend} disabled={!input.trim()} className="btn-neon px-4 py-2.5">
              <Send className="h-4 w-4" />
            </button>
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
