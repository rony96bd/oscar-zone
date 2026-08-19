import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { MessageCircle, X, Send, User, Link as LinkIcon, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { createGuestConversation, createConversation, fetchGuestConversation, sendMessage, fetchMessages, uploadChatAttachment } from '@/services/chat'
import type { ChatConversation, ChatMessage } from '@/types'
import { formatTime, cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { notifyNewMessage, requestNotificationPermission } from '@/hooks/useChatNotification'

export function LiveChatWidget() {
  const location = useLocation()
  const { profile, isAuthenticated } = useAuthStore()
  const { supportTelegram, supportFacebook } = useSettingsStore()

  const [isOpen, setIsOpen] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [isStarted, setIsStarted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)  // pulsing dot
  const lastMsgCount = useRef<number>(0)

  const [conversation, setConversation] = useState<ChatConversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  // Guest form fields
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [initialMessage, setInitialMessage] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Don't render on admin pages
  const isAdminPage = location.pathname.startsWith('/admin')

  useEffect(() => {
    if (isAdminPage) return

    // Auto-request notification permission for everyone
    if (Notification.permission === 'default') {
      requestNotificationPermission()
    }

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
    if (messagesEndRef.current && isOpen) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // Poll for new messages every 3 seconds when chat is active
  useEffect(() => {
    if (!conversation || !isStarted) return

    const poll = async () => {
      try {
        const msgs = await fetchMessages(conversation.id)
        
        const prevCount = lastMsgCount.current || msgs.length
        if (msgs.length > prevCount) {
          const newMsgs = msgs.slice(prevCount)
          const hasAdminReply = newMsgs.some((m: ChatMessage) =>
            !m.is_guest && m.sender_id !== profile?.id
          )
          if (hasAdminReply) {
            notifyNewMessage('Support Reply', newMsgs[newMsgs.length - 1].content?.slice(0, 80) || 'New reply from support')
            if (!isOpen) {
              setHasUnread(true)
            }
          }
        }
        
        lastMsgCount.current = msgs.length
        setMessages(msgs)
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
    // Ask for notification permission when chat starts
    requestNotificationPermission()
    try {
      let sessionId = localStorage.getItem('guest_chat_session')
      if (!sessionId) {
        sessionId = crypto.randomUUID()
        localStorage.setItem('guest_chat_session', sessionId)
      }
      const conv = await createGuestConversation(sessionId, name, contact || null)
      setConversation(conv)
      const msg = await sendMessage(conv.id, null, initialMessage, false, true, 'guest')
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
    // Ask for notification permission when chat starts
    requestNotificationPermission()
    try {
      const conv = await createConversation(profile.id, 'Support Request')
      setConversation(conv)
      const msg = await sendMessage(conv.id, profile.id, initialMessage, false, false, 'customer')
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
    if ((!newMessage.trim() && !attachment) || !conversation) return
    const content = newMessage
    const currentAttachment = attachment
    setNewMessage('')
    setAttachment(null)
    setUploading(true)
    
    try {
      let attachmentUrl = undefined
      if (currentAttachment) {
        attachmentUrl = await uploadChatAttachment(currentAttachment)
      }

      let msg: ChatMessage
      if (isAuthenticated && profile) {
        msg = await sendMessage(conversation.id, profile.id, content || 'Sent an attachment', false, false, 'customer', attachmentUrl)
      } else {
        msg = await sendMessage(conversation.id, null, content || 'Sent an attachment', false, true, 'guest', attachmentUrl)
      }
      
      // Add immediately to local state
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === msg.id)
        if (exists) return prev
        return [...prev, msg]
      })
    } catch (err) {
      console.error(err)
      import('sonner').then(({ toast }) => toast.error('Failed to send message'))
      setNewMessage(content)
      setAttachment(currentAttachment)
    } finally {
      setUploading(false)
    }
  }

  // Hide on admin pages
  if (isAdminPage) return null

  const displayName = isAuthenticated && profile
    ? profile.full_name || profile.username || 'You'
    : name || 'You'

  const widgetContent = (
    <div className="fixed bottom-6 right-6" style={{ zIndex: 2147483647 }}>
      {/* Contact Options */}
      {!isOpen && showOptions && (
        <div className="absolute bottom-20 right-0 mb-2 flex flex-col gap-3 items-end animate-fade-in">
          <a
            href={supportFacebook}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setShowOptions(false)}
            className="flex items-center gap-3 group"
          >
            <span className="bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Facebook</span>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:scale-105 active:scale-95 transition-all border border-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
            </div>
          </a>
          <a
            href={supportTelegram}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setShowOptions(false)}
            className="flex items-center gap-3 group"
          >
            <span className="bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Telegram</span>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg hover:scale-105 active:scale-95 transition-all border border-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </div>
          </a>
          <button
            onClick={async () => {
              setShowOptions(false)
              setIsOpen(true)
              setHasUnread(false)
              if (Notification.permission === 'default') {
                requestNotificationPermission()
              }
              if (conversation) {
                try {
                  const { markConversationAsRead } = await import('@/services/chat')
                  await markConversationAsRead(conversation.id, 'customer')
                } catch (e) {
                  console.error(e)
                }
              }
            }}
            className="flex items-center gap-3 group"
          >
            <span className="bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Live Chat</span>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-black shadow-lg hover:scale-105 active:scale-95 transition-all">
              <MessageCircle className="h-5 w-5" />
            </div>
          </button>
        </div>
      )}

      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setShowOptions(!showOptions)}
          className={cn(
            "relative flex h-14 w-14 items-center justify-center rounded-full text-black shadow-lg hover:scale-105 active:scale-95 transition-all",
            showOptions ? "bg-white shadow-white/20" : "bg-neon-green shadow-neon-green/20"
          )}
        >
          {showOptions ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
          {hasUnread && !showOptions && (
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
                          {msg.attachment_url && (
                            <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block mb-2">
                              <img src={msg.attachment_url} alt="Attachment" className="max-w-full rounded-lg object-cover" style={{ maxHeight: '150px' }} />
                            </a>
                          )}
                          {msg.content !== 'Sent an attachment' && msg.content}
                        </div>
                        <span className="mt-1 text-[10px] text-muted-foreground">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-white/10 p-3" style={{ background: '#111118' }}>
                  <form onSubmit={handleSendMessage} className="flex flex-col gap-2">
                    {uploading && (
                      <div className="flex items-center gap-2 px-2 text-xs text-neon-green">
                        <Loader2 className="h-3 w-3 animate-spin" /> Uploading image...
                      </div>
                    )}
                    {attachment && (
                      <div className="relative w-fit">
                        <img src={URL.createObjectURL(attachment)} alt="Attachment" className="h-16 w-16 object-cover rounded" />
                        <button
                          type="button"
                          onClick={() => setAttachment(null)}
                          className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive flex items-center justify-center text-white hover:scale-110"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <label className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:text-white transition-colors flex-shrink-0" style={{ background: 'rgba(255,255,255,0.07)' }}>
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                      </label>
                      <input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 rounded-full px-4 py-2 text-sm text-white focus:outline-none"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                      <button
                        type="submit"
                        disabled={(!newMessage.trim() && !attachment) || uploading}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-black disabled:opacity-40 flex-shrink-0 transition-transform active:scale-95"
                        style={{ background: '#00ff88' }}
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
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
