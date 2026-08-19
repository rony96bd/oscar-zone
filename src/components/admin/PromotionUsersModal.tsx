import { useState, useEffect } from 'react'
import { X, Search, Plus, Trash2, Loader2, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { updatePromotion } from '@/services/promotions'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import type { Promotion, Profile } from '@/types'

interface PromotionUsersModalProps {
  isOpen: boolean
  onClose: () => void
  promotion: Promotion | null
}

export function PromotionUsersModal({ isOpen, onClose, promotion }: PromotionUsersModalProps) {
  const qc = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [assignedUsers, setAssignedUsers] = useState<Profile[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingAssigned, setIsLoadingAssigned] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  // Fetch currently assigned users when modal opens
  useEffect(() => {
    if (isOpen && promotion && promotion.applicable_customer_ids && promotion.applicable_customer_ids.length > 0) {
      const fetchAssigned = async () => {
        setIsLoadingAssigned(true)
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .in('id', promotion.applicable_customer_ids || [])
          
          if (!error && data) {
            setAssignedUsers(data)
          }
        } catch (err) {
          console.error(err)
        } finally {
          setIsLoadingAssigned(false)
        }
      }
      fetchAssigned()
    } else {
      setAssignedUsers([])
    }
    setSearchTerm('')
    setSearchResults([])
  }, [isOpen, promotion])

  // Search users
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'customer')
          .or(`full_name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
          .limit(10)
        
        if (!error && data) {
          setSearchResults(data)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setIsSearching(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [searchTerm])

  if (!isOpen || !promotion) return null

  const handleAddUser = async (user: Profile) => {
    if (assignedUsers.some(u => u.id === user.id)) {
      toast.error('User already assigned')
      return
    }

    setIsUpdating(true)
    try {
      const newIds = [...(promotion.applicable_customer_ids || []), user.id]
      await updatePromotion(promotion.id, { applicable_customer_ids: newIds })
      
      setAssignedUsers(prev => [...prev, user])
      // Update the promotion object locally so we don't need to refetch immediately for the next action
      promotion.applicable_customer_ids = newIds
      
      toast.success('User added to bonus')
      qc.invalidateQueries({ queryKey: ['admin-promotions'] })
    } catch (err) {
      console.error(err)
      toast.error('Failed to add user')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRemoveUser = async (userId: string) => {
    setIsUpdating(true)
    try {
      const newIds = (promotion.applicable_customer_ids || []).filter(id => id !== userId)
      await updatePromotion(promotion.id, { applicable_customer_ids: newIds })
      
      setAssignedUsers(prev => prev.filter(u => u.id !== userId))
      promotion.applicable_customer_ids = newIds
      
      toast.success('User removed from bonus')
      qc.invalidateQueries({ queryKey: ['admin-promotions'] })
    } catch (err) {
      console.error(err)
      toast.error('Failed to remove user')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl rounded-2xl bg-game-dark border border-border p-6 shadow-2xl animate-scale-in max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-white/10 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-2 text-2xl font-bold text-white flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Assign Users
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Bonus: <span className="text-neon-gold font-bold">{promotion.name}</span>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
          
          {/* Left Side: Search & Add */}
          <div className="flex flex-col border border-white/10 rounded-xl bg-black/20 p-4 min-h-[300px]">
            <h3 className="text-sm font-semibold text-white mb-3">Search Customers</h3>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, username, or phone..."
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1" style={{ scrollbarWidth: 'thin' }}>
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map(user => {
                  const isAssigned = assignedUsers.some(u => u.id === user.id)
                  return (
                    <div key={user.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                      <div>
                        <p className="text-sm font-medium text-white">{user.full_name || 'No Name'}</p>
                        <p className="text-xs text-muted-foreground">@{user.username || user.phone}</p>
                      </div>
                      <button
                        onClick={() => handleAddUser(user)}
                        disabled={isAssigned || isUpdating}
                        className="p-1.5 rounded-md bg-primary/20 text-primary hover:bg-primary/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title={isAssigned ? "Already assigned" : "Add to bonus"}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })
              ) : searchTerm.trim() ? (
                <p className="text-center text-sm text-muted-foreground py-4">No customers found.</p>
              ) : (
                <p className="text-center text-xs text-muted-foreground py-4">Type to search customers to add.</p>
              )}
            </div>
          </div>

          {/* Right Side: Assigned Users */}
          <div className="flex flex-col border border-white/10 rounded-xl bg-black/20 p-4 min-h-[300px]">
            <h3 className="text-sm font-semibold text-white mb-3">
              Assigned Users ({assignedUsers.length})
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1" style={{ scrollbarWidth: 'thin' }}>
              {isLoadingAssigned ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : assignedUsers.length > 0 ? (
                assignedUsers.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                    <div>
                      <p className="text-sm font-medium text-white">{user.full_name || 'No Name'}</p>
                      <p className="text-xs text-muted-foreground">@{user.username || user.phone}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveUser(user.id)}
                      disabled={isUpdating}
                      className="p-1.5 rounded-md text-destructive hover:bg-destructive/20 disabled:opacity-50 transition-colors"
                      title="Remove from bonus"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No users assigned yet. This bonus applies to everyone if it's a regular bonus, or no one if it's user-specific.
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
