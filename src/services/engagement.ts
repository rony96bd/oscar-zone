import { supabase } from '@/lib/supabase'
import type { Testimonial, LiveActivity } from '@/types'

export async function getLiveActivities(): Promise<LiveActivity[]> {
  const { data, error } = await supabase.rpc('get_live_activities', { limit_count: 15 })
  if (error) throw error
  return data as LiveActivity[]
}

export async function fetchApprovedTestimonials(): Promise<Testimonial[]> {
  const { data, error } = await supabase
    .from('testimonials')
    .select('*, profiles(username, full_name)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Testimonial[]
}

export async function fetchAllTestimonials(): Promise<Testimonial[]> {
  const { data, error } = await supabase
    .from('testimonials')
    .select('*, profiles(username, full_name)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Testimonial[]
}

export async function submitTestimonial(testimonial: Partial<Testimonial>) {
  const { data, error } = await supabase
    .from('testimonials')
    .insert({
      game_name: testimonial.game_name,
      amount: testimonial.amount,
      message: testimonial.message,
      cashout_request_id: testimonial.cashout_request_id,
      user_id: (await supabase.auth.getUser()).data.user?.id
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTestimonialStatus(id: string, status: 'approved' | 'rejected' | 'pending', reward_claimed?: boolean) {
  const updates: any = { status }
  if (reward_claimed !== undefined) updates.reward_claimed = reward_claimed

  const { data, error } = await supabase
    .from('testimonials')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}
