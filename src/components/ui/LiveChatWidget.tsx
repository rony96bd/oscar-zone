import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, User, Link as LinkIcon, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { createGuestConversation, fetchGuestConversation, sendMessage, fetchMessages } from '@/services/chat'
import type { ChatConversation, ChatMessage } from '@/types'
import { formatTime } from '@/lib/utils'

export function LiveChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isStarted, setIsStarted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [conversation, setConversation] = useState<ChatConversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [initialMessage, setInitialMessage] = useState('')
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Check if guest has an existing session
    const sessionId = localStorage.getItem('guest_chat_session')
    if (sessionId) {
      loadGuestSession(sessionId)
    } else {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  useEffect(() => {
    if (!conversation) return

    const subscription = supabase
      .channel(`guest_chat_${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage])
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [conversation])

  const loadGuestSession = async (sessionId: string) => {
    try {
      const conv = await fetchGuestConversation(sessionId)
      if (conv) {
        setConversation(conv)
        setIsStarted(true)
        const msgs = await fetchMessages(conv.id)
        setMessages(msgs)
      }
    } catch (err) {
      console.error('Failed to load guest session:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const startChat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !initialMessage.trim()) return

    setIsSubmitting(true)
    try {
      let sessionId = localStorage.getItem('guest_chat_session')
      if (!sessionId) {
        sessionId = crypto.randomUUID()
        localStorage.setItem('guest_chat_session', sessionId)
      }

      const conv = await createGuestConversation(sessionId, name, contact || null)
      setConversation(conv)
      
      const msg = await sendMessage(conv.id, null, initialMessage, false, true)
      setMessages([msg])
      setIsStarted(true)
    } catch (err) {
      console.error('Failed to start chat:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !conversation) return

    const content = newMessage
    setNewMessage('')
    try {
      await sendMessage(conversation.id, null, content, false, true)
    } catch (err) {
      console.error('Failed to send message:', err)
      setNewMessage(content)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-neon-green text-black shadow-lg shadow-neon-green/20 hover:scale-105 active:scale-95 transition-all"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="flex h-[500px] max-h-[80vh] w-[350px] max-w-[calc(100vw-3rem)] flex-col rounded-2xl border border-border bg-game-dark shadow-2xl overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between bg-black/40 p-4 border-b border-border">
            <div>
              <h3 className="font-semibold text-white">Live Support</h3>
              <p className="text-xs text-neon-green">We typically reply in a few minutes</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-2 text-muted-foreground hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden relative">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-neon-green" />
              </div>
            ) : !isStarted ? (
              /* Pre-Chat Form */
              <div className="p-5 h-full overflow-y-auto no-scrollbar">
                <p className="text-sm text-muted-foreground mb-6">
                  Please fill out this form before starting the chat.
                </p>
                <form onSubmit={startChat} className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Your Name <span className="text-neon-green">*</span></label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <input
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="game-input pl-9 text-sm"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Contact Link (Optional)</label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <input
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        className="game-input pl-9 text-sm"
                        placeholder="Telegram, WhatsApp, etc."
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">How can we help? <span className="text-neon-green">*</span></label>
                    <textarea
                      required
                      value={initialMessage}
                      onChange={(e) => setInitialMessage(e.target.value)}
                      className="game-input text-sm h-24 resize-none"
                      placeholder="Type your message here..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-neon w-full py-2 text-sm"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Start Chat'}
                  </button>
                </form>
              </div>
            ) : (
              /* Active Chat Area */
              <div className="flex h-full flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                  {messages.map((msg) => {
                    const isMine = msg.is_guest
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                            isMine
                              ? 'bg-neon-green text-black rounded-tr-sm'
                              : 'bg-white/10 text-white rounded-tl-sm'
                          }`}
                        >
                          {msg.content}
                        </div>
                        <span className="mt-1 text-[10px] text-muted-foreground">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
                
                {/* Chat Input */}
                <div className="border-t border-border bg-black/40 p-3">
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-neon-green/50 transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-neon-green text-black disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 transition-transform active:scale-95"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
