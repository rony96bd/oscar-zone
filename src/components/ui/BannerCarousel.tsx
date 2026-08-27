import { useState, useEffect, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchActiveBanners } from "@/services/banners"
import type { BannerType } from "@/types"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface BannerCarouselProps {
  type?: BannerType
  className?: string
  autoPlayInterval?: number
}

export function BannerCarousel({ type = "homepage", className, autoPlayInterval = 4000 }: BannerCarouselProps) {
  const [current, setCurrent] = useState(0)

  const { data: banners = [] } = useQuery({
    queryKey: ["banners", type],
    queryFn: () => fetchActiveBanners(type),
    staleTime: 60000,
  })

  const next = useCallback(() => {
    setCurrent(c => (c + 1) % banners.length)
  }, [banners.length])

  const prev = useCallback(() => {
    setCurrent(c => (c - 1 + banners.length) % banners.length)
  }, [banners.length])

  useEffect(() => {
    if (banners.length <= 1) return
    const timer = setInterval(next, autoPlayInterval)
    return () => clearInterval(timer)
  }, [next, banners.length, autoPlayInterval])

  if (banners.length === 0) return null

  const banner = banners[current]

  const content = (
    <div className={cn("relative overflow-hidden rounded-2xl", className)}>
      {/* Image */}
      <div className="relative aspect-[21/6] sm:aspect-[21/5] overflow-hidden bg-black/40">
        <img
          key={banner.id}
          src={banner.image_url}
          alt={banner.title}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      {/* Title overlay */}
      {banner.title && (
        <div className="absolute bottom-3 left-4">
          <p className="text-sm font-semibold text-white drop-shadow-lg">{banner.title}</p>
        </div>
      )}

      {/* Navigation arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); prev() }}
            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); next() }}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      {/* Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-3 right-4 flex gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.preventDefault(); e.stopPropagation(); setCurrent(i) }}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === current ? "w-4 bg-white" : "w-1.5 bg-white/40"
              )}
            />
          ))}
        </div>
      )}
    </div>
  )

  if (banner.link_url) {
    return (
      <a href={banner.link_url} target="_blank" rel="noreferrer" className="block">
        {content}
      </a>
    )
  }

  return content
}
