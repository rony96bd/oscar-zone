import { supabase } from "@/lib/supabase"
import type { Announcement } from "@/types"

export async function fetchActiveAnnouncements(): Promise<Announcement[]> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("is_active", true)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) throw error

  return (data || []).filter((a: Announcement) => {
    if (a.start_date && new Date(a.start_date) > new Date()) return false
    if (a.end_date && new Date(a.end_date) < new Date()) return false
    return true
  })
}

export async function fetchAllAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
  if (error) throw error
  return data || []
}

export async function createAnnouncement(payload: Omit<Announcement, "id" | "created_at">): Promise<Announcement> {
  const { data, error } = await supabase
    .from("announcements")
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateAnnouncement(id: string, payload: Partial<Omit<Announcement, "id" | "created_at">>): Promise<Announcement> {
  const { data, error } = await supabase
    .from("announcements")
    .update(payload)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase.from("announcements").delete().eq("id", id)
  if (error) throw error
}
