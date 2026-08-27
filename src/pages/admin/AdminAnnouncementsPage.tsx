import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchAllAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from "@/services/announcements"
import type { Announcement } from "@/types"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Loader2, X, CheckCircle, XCircle, BellRing, AlertTriangle, Info, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

const emptyForm = {
  title: "",
  message: "",
  banner_url: "",
  priority: 0,
  is_active: true,
  start_date: "",
  end_date: "",
}

export default function AdminAnnouncementsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: fetchAllAnnouncements,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        message: form.message,
        banner_url: form.banner_url || null,
        priority: Number(form.priority),
        is_active: form.is_active,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      }
      if (editingId) {
        return updateAnnouncement(editingId, payload)
      } else {
        return createAnnouncement(payload)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-announcements"] })
      qc.invalidateQueries({ queryKey: ["announcements"] })
      toast.success(editingId ? "Announcement updated!" : "Announcement created!")
      resetForm()
    },
    onError: (err: any) => toast.error(err.message || "Failed to save announcement"),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-announcements"] })
      qc.invalidateQueries({ queryKey: ["announcements"] })
      toast.success("Announcement deleted")
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete"),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateAnnouncement(id, { is_active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-announcements"] })
      qc.invalidateQueries({ queryKey: ["announcements"] })
    },
  })

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(false)
  }

  function startEdit(item: Announcement) {
    setForm({
      title: item.title,
      message: item.message,
      banner_url: item.banner_url || "",
      priority: item.priority,
      is_active: item.is_active,
      start_date: item.start_date ? item.start_date.slice(0, 16) : "",
      end_date: item.end_date ? item.end_date.slice(0, 16) : "",
    })
    setEditingId(item.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const getPriorityInfo = (p: number) => {
    if (p >= 10) return { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", label: "Critical" }
    if (p >= 5) return { icon: BellRing, color: "text-neon-gold", bg: "bg-neon-gold/10", label: "High" }
    return { icon: Info, color: "text-primary", bg: "bg-primary/10", label: "Normal" }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-gaming font-bold text-white">Announcements</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage global alerts and notifications</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="btn-neon px-4 py-2 flex items-center gap-2 text-sm"
          >
            <Plus className="h-4 w-4" /> Add Notice
          </button>
        )}
      </div>

      {showForm && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-white text-lg">{editingId ? "Edit Announcement" : "New Announcement"}</h2>
            <button onClick={resetForm} className="text-muted-foreground hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="game-input w-full"
                  placeholder="System Maintenance"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Message *</label>
                <textarea
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  className="game-input w-full min-h-[120px] resize-y"
                  placeholder="The system will be down for maintenance on..."
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Banner / Icon URL (optional)</label>
                <input
                  value={form.banner_url}
                  onChange={e => setForm(f => ({ ...f, banner_url: e.target.value }))}
                  className="game-input w-full"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Priority (0 = Normal, 5 = High, 10 = Critical)</label>
                <input
                  type="number"
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))}
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
                  <p className="text-xs text-muted-foreground">Show this announcement to users</p>
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
              disabled={saveMutation.isPending || !form.title || !form.message}
              className="btn-neon px-6 py-2 flex items-center gap-2"
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingId ? "Update Notice" : "Create Notice"}
            </button>
            <button onClick={resetForm} className="btn-secondary px-4 py-2">Cancel</button>
          </div>
        </div>
      )}

      <div className="glass-card p-6">
        <h2 className="font-semibold text-white mb-4">All Announcements ({announcements.length})</h2>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12">
            <BellRing className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No announcements yet. Add one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map(item => {
              const pInfo = getPriorityInfo(item.priority)
              const PIcon = pInfo.icon
              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-black/20 border border-border hover:border-primary/30 transition-colors"
                >
                  <div className={cn("h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center", pInfo.bg, pInfo.color)}>
                    <PIcon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white text-base">{item.title}</p>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full border", pInfo.bg, pInfo.color, "border-current/30")}>
                        {pInfo.label} (P{item.priority})
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.message}</p>
                    {(item.start_date || item.end_date) && (
                      <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {item.start_date ? new Date(item.start_date).toLocaleDateString() : 'Any'} → {item.end_date ? new Date(item.end_date).toLocaleDateString() : 'No end'}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 sm:ml-auto w-full sm:w-auto justify-end mt-3 sm:mt-0 pt-3 sm:pt-0 border-t border-border sm:border-0">
                    <button
                      onClick={() => toggleMutation.mutate({ id: item.id, is_active: !item.is_active })}
                      title={item.is_active ? "Deactivate" : "Activate"}
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                        item.is_active
                          ? "bg-neon-green/20 text-neon-green hover:bg-neon-green/30"
                          : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      {item.is_active ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    </button>

                    <button
                      onClick={() => startEdit(item)}
                      className="h-8 w-8 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Delete "${item.title}"?`)) {
                          deleteMutation.mutate(item.id)
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
