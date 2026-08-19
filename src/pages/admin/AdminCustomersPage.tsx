import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchCustomers } from '@/services/admin'
import { Search, Plus } from 'lucide-react'
import { formatRelativeTime, cn } from '@/lib/utils'
import { CreateUserModal } from '@/components/admin/CreateUserModal'

export default function AdminCustomersPage() {
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['admin-customers', search],
    queryFn: () => fetchCustomers({ search, role: 'customer' }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-gaming font-bold text-white">Customers</h1>
          <p className="text-muted-foreground text-sm">{customers.length} users found</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-neon text-sm px-4 py-2">
          <Plus className="h-4 w-4" /> Add Customer
        </button>
      </div>
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, username, telegram..." className="game-input pl-10" />
        </div>
      </div>
      <CreateUserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} defaultRole="customer" />
      {isLoading ? (
        <div className="space-y-3">{[...Array(8)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}</div>
      ) : (
        <div className="space-y-2">
          {(customers as any[]).map((c: any) => (
            <Link key={c.id} to={`/admin/customers/${c.id}`}
              className="glass-card p-4 flex items-center gap-4 hover:border-primary/40 transition-all"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-primary text-sm">{(c.full_name || c.username)?.charAt(0)?.toUpperCase() || '?'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white text-sm">{c.full_name || c.username || 'No Name'}</p>
                  {c.is_vip && <span className="text-xs text-neon-gold">★ VIP</span>}
                  {c.role !== 'customer' && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/30">{c.role}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">@{c.username} • {c.telegram ? `TG: ${c.telegram}` : 'No Telegram'}</p>
              </div>
              <div className="text-right">
                <span className={cn('text-xs px-2 py-1 rounded-full border',
                  c.account_status === 'active' ? 'bg-neon-green/20 text-neon-green border-neon-green/30' :
                  c.account_status === 'suspended' ? 'bg-destructive/20 text-destructive border-destructive/30' :
                  'bg-muted text-muted-foreground border-border'
                )}>{c.account_status}</span>
                <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(c.created_at)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
