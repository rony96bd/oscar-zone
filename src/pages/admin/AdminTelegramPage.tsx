import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Bot, Plus, TestTube, Trash2 } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function AdminTelegramPage() {
  const { isSupportAgent } = useAuthStore()

  if (isSupportAgent()) {
    return <Navigate to="/admin" replace />
  }

  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', chat_id: '', description: '' })

  const { data: destinations = [] } = useQuery({
    queryKey: ['telegram-destinations'],
    queryFn: async () => {
      const { data } = await supabase.from('telegram_destinations').select('*').order('created_at')
      return data || []
    },
  })

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('telegram_destinations').insert(form)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Destination added'); setShowAdd(false); setForm({ name: '', chat_id: '', description: '' }); qc.invalidateQueries({ queryKey: ['telegram-destinations'] }) },
    onError: () => toast.error('Failed to add destination'),
  })

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('send-telegram-notification', { 
        body: { destination_id: id, test: true } 
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      if (data?.skipped) throw new Error('Telegram Bot Token is missing in Supabase Secrets')
      return data
    },
    onSuccess: () => toast.success('Test message sent! Check your Telegram.'),
    onError: (err: any) => toast.error(`Test failed: ${err.message || 'Unknown error'}`),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('telegram_destinations').delete().eq('id', id); if (error) throw error },
    onSuccess: () => { toast.success('Destination removed'); qc.invalidateQueries({ queryKey: ['telegram-destinations'] }) },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-gaming font-bold text-white">Telegram Integration</h1>
          <p className="text-muted-foreground text-sm">Receive order notifications on Telegram</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-neon text-sm px-4 py-2"><Plus className="h-4 w-4" /> Add Destination</button>
      </div>

      <div className="glass-card p-6">
        <h2 className="font-semibold text-white mb-3">Setup Instructions</h2>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          <li>Create a Telegram bot via <a href="https://t.me/BotFather" target="_blank" className="text-primary hover:underline">@BotFather</a></li>
          <li>Copy the bot token</li>
          <li>Set <code className="text-primary">TELEGRAM_BOT_TOKEN</code> in Supabase Edge Function secrets</li>
          <li>Add your bot to your group/channel and get the Chat ID</li>
          <li>Add the destination below and test it</li>
        </ol>
      </div>

      {showAdd && (
        <div className="glass-card p-6">
          <h2 className="font-semibold text-white mb-4">Add Telegram Destination</h2>
          <div className="space-y-3">
            <div><label className="block text-sm font-medium text-foreground mb-2">Name</label><input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Main Orders Channel" className="game-input" /></div>
            <div><label className="block text-sm font-medium text-foreground mb-2">Chat ID</label><input type="text" value={form.chat_id} onChange={e => setForm(p => ({ ...p, chat_id: e.target.value }))} placeholder="-1001234567890" className="game-input" /></div>
            <div><label className="block text-sm font-medium text-foreground mb-2">Description</label><input type="text" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" className="game-input" /></div>
            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)} className="btn-ghost-neon px-4 py-2 text-sm">Cancel</button>
              <button onClick={() => addMutation.mutate()} disabled={!form.name || !form.chat_id} className="btn-neon px-4 py-2 text-sm">Add Destination</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {(destinations as any[]).map((dest: any) => (
          <div key={dest.id} className="glass-card p-5 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 border border-primary/30">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white">{dest.name}</p>
              <p className="text-xs text-muted-foreground font-mono">Chat ID: {dest.chat_id}</p>
              {dest.description && <p className="text-xs text-muted-foreground">{dest.description}</p>}
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => testMutation.mutate(dest.id)} 
                disabled={testMutation.isPending}
                className="btn-ghost-neon px-3 py-1.5 text-xs flex items-center gap-1"
              >
                {testMutation.isPending && testMutation.variables === dest.id ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <TestTube className="h-3.5 w-3.5" />
                )}
                Test
              </button>
              <button onClick={() => deleteMutation.mutate(dest.id)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-destructive/20 transition-colors">
                <Trash2 className="h-4 w-4 text-destructive" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
