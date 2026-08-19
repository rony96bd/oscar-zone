import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { fetchConversations, fetchMessages, sendMessage, closeConversation } from '@/services/chat'
import { MessageCircle, Send, X, User } from 'lucide-react'
import { cn, formatTime } from '@/lib/utils'

export default function AdminChatPage() {
  const { profile } = useAuthStore()
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: conversations = [] } = useQuery({
    queryKey: ['admin-conversations'],
    queryFn: () => fetchConversations(profile!.id, 'admin'),
    enabled: !!profile?.id,
    refetchInterval: 10000,
  })

  const { data: fetchedMessages = [] } = useQuery({
    queryKey: ['messages', activeConvId],
    queryFn: () => fetchMessages(activeConvId!),
    enabled: !!activeConvId,
  })

  useEffect(() => { if ((fetchedMessages as any[]).length) setMessages(fetchedMessages as any[]) }, [fetchedMessages])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Poll for new messages every 3 seconds when a conversation is active
  useEffect(() => {
    if (!activeConvId) return
    const interval = setInterval(async () => {
      try {
        const msgs = await fetchMessages(activeConvId)
        setMessages(msgs)
      } catch (err) {
        console.error(err)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [activeConvId])

  const sendMutation = useMutation({
    mutationFn: (content: string) => sendMessage(activeConvId!, profile!.id, content),
    onSuccess: (msg: any) => setMessages(prev => [...prev, msg]),
  })

  const closeMutation = useMutation({
    mutationFn: (convId: string) => closeConversation(convId),
  })

  const handleSend = () => {
    if (!input.trim() || !activeConvId) return
    sendMutation.mutate(input.trim())
    setInput('')
  }

  const activeConv = (conversations as any[]).find((c: any) => c.id === activeConvId)

  return (
    <div className="flex gap-4 h-[calc(100vh-9rem)]">
      {/* Conversations List */}
      <div className="w-64 flex-shrink-0 glass-card flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-gaming font-bold text-white text-sm">Live Chat</h2>
          <p className="text-xs text-muted-foreground">{(conversations as any[]).filter((c: any) => c.status === 'open').length} open</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {(conversations as any[]).map((conv: any) => (
            <button
              key={conv.id}
              onClick={() => setActiveConvId(conv.id)}
              className={cn(
                'w-full p-3 text-left hover:bg-muted/30 transition-colors border-b border-border',
                activeConvId === conv.id && 'bg-primary/10'
              )}
            >
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <User className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {conv.customer?.full_name || conv.guest_name || 'Guest'}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">{conv.last_message || conv.subject}</p>
                </div>
                {conv.unread_count_agent > 0 && (
                  <span className="h-4 w-4 rounded-full bg-destructive text-[10px] text-white flex items-center justify-center">
                    {conv.unread_count_agent}
                  </span>
                )}
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
                {activeConv.customer?.full_name || activeConv.guest_name || 'Guest'}
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
            <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Reply..." className="game-input flex-1" />
            <button onClick={handleSend} disabled={!input.trim()} className="btn-neon px-4 py-2.5"><Send className="h-4 w-4" /></button>
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
