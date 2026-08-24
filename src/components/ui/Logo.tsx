import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { APP_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/stores/settingsStore'

interface LogoProps {
  className?: string
  iconSize?: 'sm' | 'md' | 'lg'
  textClassName?: string
  href?: string
}

export function Logo({ className, iconSize = 'md', textClassName, href = '/' }: LogoProps) {
  const [error, setError] = useState(false)
  const { siteLogoUrl, isLoading } = useSettingsStore()

  useEffect(() => {
    if (siteLogoUrl) {
      setError(false)
    }
  }, [siteLogoUrl])

  const dimensions = {
    sm: { img: 'h-6', iconBox: 'h-7 w-7', icon: 'h-4 w-4' },
    md: { img: 'h-8', iconBox: 'h-8 w-8', icon: 'h-5 w-5' },
    lg: { img: 'h-10', iconBox: 'h-10 w-10', icon: 'h-6 w-6' },
  }

  const d = dimensions[iconSize]

  let content;
  
  if (isLoading) {
    content = <div className={cn("animate-pulse bg-white/5 rounded", d.img, "w-24")} />
  } else {
    content = (
      <>
        {!error ? (
          <img 
            src={siteLogoUrl || "/logo.png"} 
            alt={APP_NAME} 
            className={cn(`${d.img} w-auto object-contain`, className)}
            onError={() => setError(true)} 
          />
        ) : (
          <>
            <div className={cn("flex flex-shrink-0 items-center justify-center rounded-lg bg-primary/20 border border-primary/30", d.iconBox)}>
              <Zap className={cn("text-primary", d.icon)} style={{ filter: 'drop-shadow(0 0 6px rgba(0,212,255,0.8))' }} />
            </div>
            <span className={cn("font-gaming font-bold text-white", textClassName)}>
              {APP_NAME}
            </span>
          </>
        )}
      </>
    )
  }

  const wrapperClass = "inline-flex items-center gap-2"

  if (href) {
    return (
      <Link to={href} className={wrapperClass}>
        {content}
      </Link>
    )
  }

  return (
    <div className={wrapperClass}>
      {content}
    </div>
  )
}
