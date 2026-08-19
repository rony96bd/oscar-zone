import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { MessageCircle, X, Send, User, Link as LinkIcon, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { createGuestConversation, createConversation, fetchGuestConversation, sendMessage, fetchMessages } from '@/services/chat'
import type { ChatConversation, ChatMessage } from '@/types'
import { formatTime } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { notifyNewMessage } from '@/hooks/useChatNotification'

export function LiveChatWidget() {
  const location = useLocation()
  const { profile, isAuthenticated } = useAuthStore()

  const [isOpen, setIsOpen] = useState(false)
  const [isStarted, setIsStarted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)  // pulsing dot

  const [conversation, setConversation] = useState<ChatConversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')

  // Guest form fields
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [initialMessage, setInitialMessage] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Don't render on admin pages
  const isAdminPage = location.pathname.startsWith('/admin')

  useEffect(() => {
    if (isAdminPage) return

    if (isAuthenticated && profile) {
      // Logged-in user: check if they have a conversation
      loadUserSession()
    } else {
      // Guest: check localStorage session
      const sessionId = localStorage.getItem('guest_chat_session')
      if (sessionId) {
        loadGuestSession(sessionId)
      } else {
        setIsLoading(false)
      }
    }
  }, [isAuthenticated, profile, isAdminPage])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // Poll for new messages every 3 seconds when chat is active
  useEffect(() => {
    if (!conversation || !isStarted) return

    const poll = async () => {
      try {
        const msgs = await fetchMessages(conversation.id)
        setMessages(prev => {
          const prevCount = prev.length
          if (msgs.length > prevCount) {
            // Check if new messages are from admin (not guest, not current user)
            const newMsgs = msgs.slice(prevCount)
            const hasAdminReply = newMsgs.some((m: ChatMessage) =>
              !m.is_guest && m.sender_id !== profile?.id
            )
            if (hasAdminReply) {
              notifyNewMessage('Support Reply', newMsgs[newMsgs.length - 1].content?.slice(0, 80) || 'New reply from support')
              if (!isOpen) setHasUnread(true)
            }
          }
          return msgs
        })
      } catch (err) {
        console.error(err)
      }
    }

    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [conversation, isStarted, isOpen, profile?.id])

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
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadUserSession = async () => {
    if (!profile) return
    try {
      // Look for existing open conversation for this user
      const { data } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('customer_id', profile.id)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (data) {
        setConversation(data)
        setIsStarted(true)
        const msgs = await fetchMessages(data.id)
        setMessages(msgs)
      }
    } catch {
      // No existing conversation — will start fresh
    } finally {
      setIsLoading(false)
    }
  }

  // Guest: start chat from form
  const startGuestChat = async (e: React.FormEvent) => {
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
      setMessages((prev) => [...prev, msg])
      setIsStarted(true)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Logged-in user: start chat directly with first message
  const startUserChat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!initialMessage.trim() || !profile) return
    setIsSubmitting(true)
    try {
      const conv = await createConversation(profile.id, 'Support Request')
      setConversation(conv)
      const msg = await sendMessage(conv.id, profile.id, initialMessage, false, false)
      setMessages((prev) => [...prev, msg])
      setIsStarted(true)
    } catch (err) {
      console.error(err)
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
      let msg: ChatMessage
      if (isAuthenticated && profile) {
        msg = await sendMessage(conversation.id, profile.id, content, false, false)
      } else {
        msg = await sendMessage(conversation.id, null, content, false, true)
      }
      // Add immediately to local state
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === msg.id)
        if (exists) return prev
        return [...prev, msg]
      })
    } catch (err) {
      console.error(err)
      setNewMessage(content)
    }
  }

  // Hide on admin pages
  if (isAdminPage) return null

  const displayName = isAuthenticated && profile
    ? profile.full_name || profile.username || 'You'
    : name || 'You'

  const widgetContent = (
    <div className="fixed bottom-6 right-6" style={{ zIndex: 2147483647 }}>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => { setIsOpen(true); setHasUnread(false) }}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-neon-green text-black shadow-lg shadow-neon-green/20 hover:scale-105 active:scale-95 transition-all"
        >
          <MessageCircle className="h-6 w-6" />
          {hasUnread && (
            <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-500 border-2 border-black animate-pulse" />
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className="flex h-[500px] max-h-[80vh] w-[350px] max-w-[calc(100vw-3rem)] flex-col rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-scale-in"
          style={{ background: '#0a0a0f' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10" style={{ background: '#111118' }}>
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

          {/* Body */}
          <div className="flex-1 overflow-hidden relative">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-neon-green" />
              </div>

            ) : !isStarted ? (
              /* Pre-Chat Form */
              <div className="p-5 h-full overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                <p className="text-sm text-muted-foreground mb-5">
                  {isAuthenticated
                    ? `Hi ${displayName}! How can we help you today?`
                    : 'Please fill out this form before starting the chat.'}
                </p>
                <form onSubmit={isAuthenticated ? startUserChat : startGuestChat} className="space-y-4">
                  {/* Guest-only fields */}
                  {!isAuthenticated && (
                    <>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">
                          Your Name <span className="text-neon-green">*</span>
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <input
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-neon-green/50"
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
                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-neon-green/50"
                            placeholder="Telegram, WhatsApp, etc."
                          />
                        </div>
                      </div>
                    </>
                  )}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      How can we help? <span className="text-neon-green">*</span>
                    </label>
                    <textarea
                      required
                      value={initialMessage}
                      onChange={(e) => setInitialMessage(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-neon-green/50 h-24 resize-none"
                      placeholder="Type your message here..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-black transition-all"
                    style={{ background: '#00ff88' }}
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Start Chat'}
                  </button>
                </form>
              </div>

            ) : (
              /* Active Chat */
              <div className="flex h-full flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: 'none' }}>
                  {messages.map((msg) => {
                    const isMine = isAuthenticated ? msg.sender_id === profile?.id : msg.is_guest
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                            isMine
                              ? 'text-black rounded-tr-sm'
                              : 'text-white rounded-tl-sm'
                          }`}
                          style={{ background: isMine ? '#00ff88' : 'rgba(255,255,255,0.1)' }}
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

                {/* Input */}
                <div className="border-t border-white/10 p-3" style={{ background: '#111118' }}>
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 rounded-full px-4 py-2 text-sm text-white focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-black disabled:opacity-40 flex-shrink-0 transition-transform active:scale-95"
                      style={{ background: '#00ff88' }}
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

  return createPortal(widgetContent, document.body)
}
