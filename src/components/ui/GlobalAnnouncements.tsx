import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchActiveAnnouncements } from "@/services/announcements"
import { X, AlertTriangle, BellRing, Info, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

export function GlobalAnnouncements() {
  const { data: announcements = [] } = useQuery({
    queryKey: ["active-announcements"],
    queryFn: fetchActiveAnnouncements,
    staleTime: 60000,
  })

  // Keep track of dismissed announcements in localStorage
  const [dismissedIds, setDismissedIds] = useState<string[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem("dismissed_announcements")
      if (stored) setDismissedIds(JSON.parse(stored))
    } catch {}
  }, [])

  const handleDismiss = (id: string) => {
    const newDismissed = [...dismissedIds, id]
    setDismissedIds(newDismissed)
    localStorage.setItem("dismissed_announcements", JSON.stringify(newDismissed))
  }

  // Filter out dismissed ones
  const visible = announcements.filter(a => !dismissedIds.includes(a.id))

  if (visible.length === 0) return null

  // Just show the top priority one
  const notice = visible[0]

  const isCritical = notice.priority >= 10
  const isHigh = notice.priority >= 5

  const Icon = isCritical ? AlertTriangle : (isHigh ? BellRing : Info)
  
  const bg = isCritical 
    ? "bg-destructive border-b-destructive text-white" 
    : (isHigh ? "bg-neon-gold/20 border-b-neon-gold/50 text-neon-gold" : "bg-primary/20 border-b-primary/50 text-primary-foreground")

  return (
    <div className={cn("relative w-full z-50 border-b py-2 px-4 shadow-md", bg)}>
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5 sm:mt-0", isCritical ? "text-white" : "text-current")} />
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm">
            <span className="font-bold">{notice.title}</span>
            <span className={cn("hidden sm:inline opacity-70", isCritical ? "text-white" : "text-current")}>|</span>
            <span className="opacity-90">{notice.message}</span>
            {notice.banner_url && (
              <a 
                href={notice.banner_url} 
                target="_blank" 
                rel="noreferrer" 
                className={cn("inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:opacity-80 mt-1 sm:mt-0", isCritical ? "text-white" : "text-current")}
              >
                Learn More <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
        <button
          onClick={() => handleDismiss(notice.id)}
          className={cn("p-1.5 rounded-md hover:bg-black/20 transition-colors flex-shrink-0", isCritical ? "text-white" : "text-current")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
