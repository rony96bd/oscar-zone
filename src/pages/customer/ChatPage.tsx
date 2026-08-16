import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { fetchConversations, createConversation, fetchMessages, sendMessage } from '@/services/chat'
import { useRealtimeChat } from '@/hooks/useRealtime'
import { Send, MessageCircle, Loader2 } from 'lucide-react'
import { cn, formatTime } from '@/lib/utils'

export default function ChatPage() {
  const { profile } = useAuthStore()
  const [conversation, setConversation] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', profile?.id],
    queryFn: () => fetchConversations(profile!.id, 'customer'),
    enabled: !!profile?.id,
  })

  const { data: fetchedMessages = [] } = useQuery({
    queryKey: ['messages', conversation?.id],
    queryFn: () => fetchMessages(conversation!.id),
    enabled: !!conversation?.id,
  })

  useEffect(() => { if ((fetchedMessages as any[]).length) setMessages(fetchedMessages as any[]) }, [fetchedMessages])
  useEffect(() => { if ((conversations as any[]).length && !conversation) setConversation((conversations as any[])[0]) }, [conversations])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useRealtimeChat(conversation?.id || '', (msg: any) => setMessages(prev => [...prev, msg]))

  const createMutation = useMutation({
    mutationFn: () => createConversation(profile!.id, 'Support Request'),
    onSuccess: (conv: any) => setConversation(conv),
  })

  const sendMutation = useMutation({
    mutationFn: (content: string) => sendMessage(conversation!.id, profile!.id, content),
    onSuccess: (msg: any) => setMessages(prev => [...prev, msg]),
  })

  const handleSend = () => {
    if (!input.trim() || !conversation) return
    sendMutation.mutate(input.trim())
    setInput('')
  }

  if (!conversation && (conversations as any[]).length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 border border-primary/30 mx-auto mb-4">
          <MessageCircle className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-gaming font-bold text-white mb-2">Live Support</h1>
        <p className="text-muted-foreground mb-6">Start a conversation with our support team</p>
        <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="btn-neon px-8 py-3">
          {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
          Start Chat
        </button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-24 lg:pb-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-4"><h1 className="text-xl font-gaming font-bold text-white">Live Support</h1></div>
        <div className="glass-card flex flex-col" style={{ height: '70vh' }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg: any) => {
              const isMe = msg.sender_id === profile?.id
              return (
                <div key={msg.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                  <div className={isMe ? 'chat-bubble-agent' : 'chat-bubble-customer'}>
                    <p>{msg.content}</p>
                    <p className="text-[10px] opacity-60 mt-1">{formatTime(msg.created_at)}</p>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
          <div className="border-t border-border p-3 flex gap-2">
            <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Type a message..." className="game-input flex-1" />
            <button onClick={handleSend} disabled={!input.trim() || sendMutation.isPending} className="btn-neon px-4 py-2.5"><Send className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
    </div>
  )
}
