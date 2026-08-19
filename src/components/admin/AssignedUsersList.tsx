import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function AssignedUsersList({ ids }: { ids: string[] }) {
  const [names, setNames] = useState<string[]>([])

  useEffect(() => {
    if (!ids || ids.length === 0) return
    supabase.from('profiles').select('full_name, username').in('id', ids)
      .then(({ data }) => {
        if (data) {
          setNames(data.map(d => d.full_name || d.username || 'Unknown'))
        }
      })
  }, [ids])

  if (names.length === 0) return null

  const display = names.slice(0, 3).join(', ') + (names.length > 3 ? ` +${names.length - 3} more` : '')
  
  return <span>{display}</span>
}
