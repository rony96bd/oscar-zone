import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { fetchConversations, createConversation, fetchMessages, sendMessage, uploadChatAttachment } from '@/services/chat'
import { useRealtimeChat } from '@/hooks/useRealtime'
import { Send, MessageCircle, Loader2, X } from 'lucide-react'
import { cn, formatTime } from '@/lib/utils'

export default function ChatPage() {
  const { profile } = useAuthStore()
  const [conversation, setConversation] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
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

  useRealtimeChat(conversation?.id || '', (msg: any) => setMessages(prev => {
    if (prev.some(m => m.id === msg.id)) return prev
    return [...prev, msg]
  }))

  const createMutation = useMutation({
    mutationFn: () => createConversation(profile!.id, 'Support Request'),
    onSuccess: (conv: any) => setConversation(conv),
  })

  const handleSend = async () => {
    if ((!input.trim() && !attachment) || !conversation) return
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
      const msg = await sendMessage(conversation.id, profile!.id, content || 'Sent an attachment', false, false, 'customer', attachmentUrl)
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
                    {msg.attachment_url && (
                      <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block mb-2">
                        <img src={msg.attachment_url} alt="Attachment" className="max-w-full rounded-lg object-cover" style={{ maxHeight: '200px' }} />
                      </a>
                    )}
                    {msg.content !== 'Sent an attachment' && <p>{msg.content}</p>}
                    <p className="text-[10px] opacity-60 mt-1">{formatTime(msg.created_at)}</p>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
          <div className="border-t border-border p-3 flex flex-col gap-2">
            {uploading && (
              <div className="flex items-center gap-2 px-2 text-xs text-primary">
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
              <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Type a message..." className="game-input flex-1" />
              <button onClick={handleSend} disabled={(!input.trim() && !attachment) || uploading} className="btn-neon px-4 py-2.5"><Send className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
