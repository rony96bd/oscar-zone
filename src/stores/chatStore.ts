import { create } from 'zustand'
import type { ChatConversation, ChatMessage } from '@/types'

interface ChatState {
  conversations: ChatConversation[]
  activeConversationId: string | null
  messages: Record<string, ChatMessage[]>
  isTyping: Record<string, boolean>
  unreadCount: number
  setConversations: (conversations: ChatConversation[]) => void
  setActiveConversation: (id: string | null) => void
  addMessage: (conversationId: string, message: ChatMessage) => void
  setMessages: (conversationId: string, messages: ChatMessage[]) => void
  setTyping: (conversationId: string, isTyping: boolean) => void
  setUnreadCount: (count: number) => void
  updateConversation: (id: string, updates: Partial<ChatConversation>) => void
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  isTyping: {},
  unreadCount: 0,

  setConversations: (conversations) =>
    set({
      conversations,
      unreadCount: conversations.reduce((acc, c) => acc + c.unread_count_agent, 0),
    }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  addMessage: (conversationId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] || []), message],
      },
    })),

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: messages },
    })),

  setTyping: (conversationId, isTyping) =>
    set((state) => ({
      isTyping: { ...state.isTyping, [conversationId]: isTyping },
    })),

  setUnreadCount: (unreadCount) => set({ unreadCount }),

  updateConversation: (id, updates) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),
}))
