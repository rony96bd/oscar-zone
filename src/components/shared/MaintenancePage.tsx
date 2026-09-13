import { useEffect, useRef } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'

function GearIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 15.5A3.5 3.5 0 018.5 12 3.5 3.5 0 0112 8.5a3.5 3.5 0 013.5 3.5 3.5 3.5 0 01-3.5 3.5m7.43-2.92c.04-.34.07-.68.07-1.08s-.03-.74-.07-1.08l2.32-1.82c.21-.16.27-.46.13-.7l-2.2-3.82c-.14-.24-.42-.32-.66-.24l-2.74 1.1c-.57-.44-1.18-.8-1.86-1.07L14.92 1.3c-.04-.26-.27-.45-.54-.45h-4.4c-.27 0-.5.19-.54.45l-.42 2.9c-.68.27-1.29.63-1.86 1.07L4.42 4.17c-.24-.08-.52 0-.66.24L1.56 8.23c-.14.24-.08.54.13.7l2.32 1.82c-.04.34-.07.69-.07 1.08s.03.74.07 1.08L1.69 14.73c-.21.16-.27.46-.13.7l2.2 3.82c.14.24.42.32.66.24l2.74-1.1c.57.44 1.18.8 1.86 1.07l.42 2.9c.04.26.27.45.54.45h4.4c.27 0 .5-.19.54-.45l.42-2.9c.68-.27 1.29-.63 1.86-1.07l2.74 1.1c.24.08.52 0 .66-.24l2.2-3.82c.14-.24.08-.54-.13-.7l-2.32-1.82z" />
    </svg>
  )
}

function WrenchIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z" />
    </svg>
  )
}

export default function MaintenancePage() {
  const { siteLogoUrl, siteName } = useSettingsStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Floating particles on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const setSize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    setSize()
    window.addEventListener('resize', setSize)

    const colors = ['#00d4ff', '#00ff88', '#8a2be2', '#ff00c8', '#ffcc00']
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.5 + 0.1,
      color: colors[Math.floor(Math.random() * colors.length)],
    }))

    let animId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.opacity
        ctx.fill()
      }
      ctx.globalAlpha = 1
      animId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', setSize)
    }
  }, [])

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#040a14]">
      {/* Canvas particles */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Background radial glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div
          className="w-[700px] h-[700px] rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, #00d4ff 0%, #8a2be2 45%, transparent 70%)',
            animation: 'pulse 4s ease-in-out infinite',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg w-full">

        {/* Logo / Site name */}
        <div className="mb-8">
          {siteLogoUrl ? (
            <img src={siteLogoUrl} alt={siteName} className="h-16 object-contain mx-auto drop-shadow-lg" />
          ) : (
            <span
              className="text-2xl font-black tracking-widest uppercase"
              style={{ color: '#00d4ff', textShadow: '0 0 24px #00d4ff88' }}
            >
              {siteName}
            </span>
          )}
        </div>

        {/* Gears + Wrench animation cluster */}
        <div className="relative w-36 h-36 flex items-center justify-center mb-8">
          {/* Outer slow gear */}
          <GearIcon
            className="absolute w-36 h-36 text-cyan-500/40"
            style={{ animation: 'spin 12s linear infinite' }}
          />
          {/* Mid gear */}
          <GearIcon
            className="absolute w-24 h-24 text-cyan-400/70"
            style={{ animation: 'spin 8s linear infinite' }}
          />
          {/* Small counter-spin gear (top-right) */}
          <GearIcon
            className="absolute w-12 h-12 text-purple-400/80"
            style={{
              animation: 'spin 4s linear infinite reverse',
              top: '4px',
              right: '4px',
            }}
          />
          {/* Center wrench */}
          <WrenchIcon
            className="relative z-10 w-10 h-10 text-white"
            style={{ animation: 'wobble 2s ease-in-out infinite' }}
          />
        </div>

        {/* Main title */}
        <h1
          className="text-4xl sm:text-5xl font-black tracking-tight mb-3 uppercase leading-tight"
          style={{
            background: 'linear-gradient(135deg, #00d4ff 0%, #ffffff 50%, #00ff88 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'glow-text 3s ease-in-out infinite',
          }}
        >
          Under Maintenance
        </h1>

        {/* Subtitle */}
        <p className="text-gray-300 text-lg font-medium mb-2">
          We&apos;re making things better for you.
        </p>
        <p className="text-gray-500 text-sm mb-10 leading-relaxed max-w-sm">
          Our team is working hard behind the scenes to bring you an even better experience.
          We&apos;ll be back online shortly — thank you for your patience!
        </p>

        {/* Progress bar */}
        <div className="w-full max-w-xs mb-8">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-gray-500">System update in progress</span>
            <span
              className="text-cyan-400 font-semibold"
              style={{ animation: 'blink 1.5s ease-in-out infinite' }}
            >
              ● Live
            </span>
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, #00d4ff, #00ff88)',
                boxShadow: '0 0 10px #00d4ff',
                animation: 'progress-bar 3s ease-in-out infinite',
              }}
            />
          </div>
        </div>

        {/* Status cards */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {[
            { label: 'Estimated Time', value: 'Coming Soon', icon: '⏱' },
            { label: 'Status', value: 'Updating', icon: '🔧' },
            { label: 'Progress', value: 'Active', icon: '✅' },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl p-3 border border-white/10 bg-white/5 backdrop-blur-sm"
              style={{ boxShadow: '0 4px 24px rgba(0,212,255,0.05)' }}
            >
              <div className="text-xl mb-1">{item.icon}</div>
              <div className="text-xs text-gray-500 mb-0.5">{item.label}</div>
              <div className="text-sm font-bold text-white">{item.value}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="mt-10 text-xs text-gray-600">
          &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
        </p>
      </div>

      {/* Custom keyframe animations */}
      <style>{`
        @keyframes wobble {
          0%, 100% { transform: rotate(-12deg); }
          50% { transform: rotate(12deg); }
        }
        @keyframes glow-text {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(0,212,255,0.4)); }
          50% { filter: drop-shadow(0 0 28px rgba(0,255,136,0.6)); }
        }
        @keyframes progress-bar {
          0%   { width: 10%; }
          50%  { width: 85%; }
          100% { width: 10%; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
      `}</style>
    </div>
  )
}
