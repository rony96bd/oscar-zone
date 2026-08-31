import { useState, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchAllBanners, createBanner, updateBanner, deleteBanner, uploadBannerImage } from "@/services/banners"
import type { Banner, BannerType } from "@/types"
import { toast } from "sonner"
import { Navigate } from "react-router-dom"
import { useAuthStore } from "@/stores/authStore"
import { Plus, Pencil, Trash2, Loader2, Image as ImageIcon, ExternalLink, X, CheckCircle, XCircle, Upload } from "lucide-react"
import { cn } from "@/lib/utils"

const BANNER_TYPES: { value: BannerType; label: string }[] = [
  { value: "homepage", label: "Homepage" },
  { value: "promotion", label: "Promotion" },
  { value: "announcement", label: "Announcement" },
  { value: "game", label: "Game" },
  { value: "referral", label: "Referral" },
]

const emptyForm = {
  title: "",
  image_url: "",
  link_url: "",
  type: "homepage" as BannerType,
  sort_order: 0,
  is_active: true,
  start_date: "",
  end_date: "",
}

export default function AdminBannersPage() {
  const { isSupportAgent } = useAuthStore()

  if (isSupportAgent()) {
    return <Navigate to="/admin" replace />
  }

  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [isUploading, setIsUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string>("")

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: fetchAllBanners,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        image_url: form.image_url,
        link_url: form.link_url || null,
        type: form.type,
        sort_order: Number(form.sort_order),
        is_active: form.is_active,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      }
      if (editingId) {
        return updateBanner(editingId, payload)
      } else {
        return createBanner(payload)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-banners"] })
      qc.invalidateQueries({ queryKey: ["banners"] })
      toast.success(editingId ? "Banner updated!" : "Banner created!")
      resetForm()
    },
    onError: (err: any) => toast.error(err.message || "Failed to save banner"),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBanner,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-banners"] })
      qc.invalidateQueries({ queryKey: ["banners"] })
      toast.success("Banner deleted")
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete"),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateBanner(id, { is_active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-banners"] })
      qc.invalidateQueries({ queryKey: ["banners"] })
    },
  })

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(false)
    setImagePreview("")
  }

  function startEdit(banner: Banner) {
    setForm({
      title: banner.title,
      image_url: banner.image_url,
      link_url: banner.link_url || "",
      type: banner.type,
      sort_order: banner.sort_order,
      is_active: banner.is_active,
      start_date: banner.start_date ? banner.start_date.slice(0, 16) : "",
      end_date: banner.end_date ? banner.end_date.slice(0, 16) : "",
    })
    setImagePreview(banner.image_url)
    setEditingId(banner.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      return toast.error("Only JPG, PNG, WEBP or GIF allowed")
    }
    if (file.size > 5 * 1024 * 1024) return toast.error("Max image size is 5MB")

    setIsUploading(true)
    try {
      const url = await uploadBannerImage(file)
      setForm(f => ({ ...f, image_url: url }))
      setImagePreview(url)
      toast.success("Image uploaded!")
    } catch (err: any) {
      toast.error(err.message || "Upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-gaming font-bold text-white">Banners</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage promotional banners across the site</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="btn-neon px-4 py-2 flex items-center gap-2 text-sm"
          >
            <Plus className="h-4 w-4" /> Add Banner
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-white text-lg">{editingId ? "Edit Banner" : "New Banner"}</h2>
            <button onClick={resetForm} className="text-muted-foreground hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="game-input w-full"
                  placeholder="Summer Promo Banner"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Banner Image *</label>
                <div
                  className={cn(
                    "relative border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all",
                    imagePreview ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/40 bg-black/20"
                  )}
                  onClick={() => fileRef.current?.click()}
                >
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="preview" className="w-full h-40 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setImagePreview(""); setForm(f => ({ ...f, image_url: "" })) }}
                        className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-destructive transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
                      {isUploading ? (
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      ) : (
                        <>
                          <Upload className="h-8 w-8" />
                          <p className="text-sm">Click to upload image</p>
                          <p className="text-xs">JPG, PNG, WEBP, GIF • Max 5MB</p>
                        </>
                      )}
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Or paste URL directly:</p>
                <input
                  value={form.image_url}
                  onChange={e => { setForm(f => ({ ...f, image_url: e.target.value })); setImagePreview(e.target.value) }}
                  className="game-input w-full mt-1 text-xs"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Link URL (optional)</label>
                <input
                  value={form.link_url}
                  onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))}
                  className="game-input w-full"
                  placeholder="https://oscarzone.com/load"
                />
              </div>
            </div>

            {/* Right */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Type *</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as BannerType }))}
                  className="game-input w-full"
                >
                  {BANNER_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Sort Order</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                  className="game-input w-full"
                  min={0}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Start Date (optional)</label>
                <input
                  type="datetime-local"
                  value={form.start_date}
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                  className="game-input w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">End Date (optional)</label>
                <input
                  type="datetime-local"
                  value={form.end_date}
                  onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                  className="game-input w-full"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-border">
                <div>
                  <p className="text-sm font-semibold text-white">Active</p>
                  <p className="text-xs text-muted-foreground">Show this banner on the site</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-green" />
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-border">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !form.title || !form.image_url}
              className="btn-neon px-6 py-2 flex items-center gap-2"
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingId ? "Update Banner" : "Create Banner"}
            </button>
            <button onClick={resetForm} className="btn-secondary px-4 py-2">Cancel</button>
          </div>
        </div>
      )}

      {/* Banner List */}
      <div className="glass-card p-6">
        <h2 className="font-semibold text-white mb-4">All Banners ({banners.length})</h2>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : banners.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No banners yet. Add one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {banners.map(banner => (
              <div
                key={banner.id}
                className="flex items-center gap-4 p-3 rounded-xl bg-black/20 border border-border hover:border-primary/30 transition-colors"
              >
                {/* Thumbnail */}
                <div className="h-16 w-28 flex-shrink-0 rounded-lg overflow-hidden bg-black/40 border border-border">
                  <img
                    src={banner.image_url}
                    alt={banner.title}
                    className="h-full w-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='60'%3E%3Crect fill='%23333' width='100' height='60'/%3E%3C/svg%3E" }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">{banner.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 capitalize">
                      {banner.type}
                    </span>
                    <span className="text-xs text-muted-foreground">Order: {banner.sort_order}</span>
                    {banner.link_url && (
                      <a href={banner.link_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {(banner.start_date || banner.end_date) && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {banner.start_date ? new Date(banner.start_date).toLocaleDateString() : 'Any'} → {banner.end_date ? new Date(banner.end_date).toLocaleDateString() : 'No end'}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Active Toggle */}
                  <button
                    onClick={() => toggleMutation.mutate({ id: banner.id, is_active: !banner.is_active })}
                    title={banner.is_active ? "Deactivate" : "Activate"}
                    className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                      banner.is_active
                        ? "bg-neon-green/20 text-neon-green hover:bg-neon-green/30"
                        : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    {banner.is_active ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => startEdit(banner)}
                    className="h-8 w-8 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${banner.title}"?`)) {
                        deleteMutation.mutate(banner.id)
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
