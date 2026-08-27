import { supabase } from "@/lib/supabase"
import type { Banner, BannerType } from "@/types"

export async function fetchActiveBanners(type?: BannerType): Promise<Banner[]> {
  const now = new Date().toISOString()
  let query = supabase
    .from("banners")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })

  if (type) query = query.eq("type", type)

  const { data, error } = await query
  if (error) throw error

  const filtered = (data || []).filter((b: Banner) => {
    if (b.start_date && new Date(b.start_date) > new Date()) return false
    if (b.end_date && new Date(b.end_date) < new Date()) return false
    return true
  })
  return filtered
}

export async function fetchAllBanners(): Promise<Banner[]> {
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .order("sort_order", { ascending: true })
  if (error) throw error
  return data || []
}

export async function createBanner(payload: Omit<Banner, "id" | "created_at">): Promise<Banner> {
  const { data, error } = await supabase
    .from("banners")
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateBanner(id: string, payload: Partial<Omit<Banner, "id" | "created_at">>): Promise<Banner> {
  const { data, error } = await supabase
    .from("banners")
    .update(payload)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteBanner(id: string): Promise<void> {
  const { error } = await supabase.from("banners").delete().eq("id", id)
  if (error) throw error
}

export async function uploadBannerImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "png"
  const path = `banner-${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from("banners")
    .upload(path, file, { cacheControl: "3600", upsert: false })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from("banners").getPublicUrl(path)
  return data.publicUrl
}
