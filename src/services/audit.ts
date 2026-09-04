import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

export interface AuditLog {
  id: string
  admin_id: string
  action: string
  target_type: string | null
  target_id: string | null
  previous_value: any
  new_value: any
  details: any
  ip_address: string | null
  created_at: string
  admin?: Profile
}

export async function logAuditAction(
  adminId: string | null | undefined,
  action: string,
  targetType: string | null = null,
  targetId: string | null = null,
  details: any = null,
  previousValue: any = null,
  newValue: any = null
) {
  try {
    let finalAdminId = adminId
    if (!finalAdminId) {
      const authStore = await import('@/stores/authStore')
      finalAdminId = authStore.useAuthStore.getState().profile?.id
    }

    if (!finalAdminId) {
      console.warn('logAuditAction: No admin ID available, skipping log.')
      return
    }

    const { error } = await supabase.from('audit_logs').insert({
      admin_id: finalAdminId,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
      previous_value: previousValue,
      new_value: newValue
    })

    if (error) {
      console.error('Failed to log audit action:', error)
    }
  } catch (err) {
    console.error('Exception in logAuditAction:', err)
  }
}

export async function fetchAuditLogs(
  page = 1,
  limit = 50,
  filters?: {
    adminId?: string
    action?: string
    targetType?: string
    startDate?: string
    endDate?: string
  }
) {
  try {
    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        admin:profiles!audit_logs_admin_id_fkey(id, full_name, username, email, role)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    if (filters?.adminId) query = query.eq('admin_id', filters.adminId)
    if (filters?.action) query = query.eq('action', filters.action)
    if (filters?.targetType) query = query.eq('target_type', filters.targetType)
    if (filters?.startDate) query = query.gte('created_at', filters.startDate)
    if (filters?.endDate) query = query.lte('created_at', filters.endDate)

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) throw error

    return {
      logs: data as AuditLog[],
      total: count || 0
    }
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    throw error
  }
}
