import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Share2, Maximize2, Info, Copy, Check, ShieldCheck, ExternalLink } from 'lucide-react'
import { fetchPaymentMethods } from '@/services/payments'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function PaymentTagsPage() {
  const { data: paymentMethods = [], isLoading } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: fetchPaymentMethods
  })

  useEffect(() => {
    const originalTitle = document.title
    const newTitle = 'Payment Tags - Oscar Zone'
    document.title = newTitle

    const ogTitle = document.getElementById('og-title')
    const originalOgTitle = ogTitle?.getAttribute('content')
    if (ogTitle) ogTitle.setAttribute('content', newTitle)

    return () => {
      document.title = originalTitle
      if (ogTitle && originalOgTitle) ogTitle.setAttribute('content', originalOgTitle)
    }
  }, [])

  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.success('Payment tag copied to clipboard')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleShare = async (pm: any) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Pay via ${pm.name}`,
          text: `Use this tag to pay: ${pm.tag}`,
        })
      } catch (err) {
        console.error('Error sharing', err)
      }
    } else {
      handleCopy(pm.tag || '', pm.id)
    }
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="min-h-screen bg-game-darker pb-16">
      {/* Important Notice Banner */}
      <div className="border-b border-red-500/40 bg-red-500/20">
        <div className="mx-auto flex max-w-md items-start gap-3 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div className="min-w-0 text-xs leading-relaxed text-red-100 sm:text-sm">
            <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-widest text-red-400">
              Important Notice
            </span>
            <span className="text-white/90">
              Payment tags change frequently. Never use old screenshots or saved QR codes. Always verify current tags below before sending.
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-5">
        <header className="py-10 text-center">
          <div className="mx-auto mb-5 h-28 w-28 rounded-3xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_30px_rgba(var(--primary),0.3)]">
            <ShieldCheck className="h-14 w-14 text-primary" />
          </div>
          <h1 className="text-3xl font-gaming font-bold tracking-tight text-white">Payment Tags</h1>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Always Use the Latest Payment Information
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-green opacity-60"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-neon-green"></span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Verified Active
            </span>
          </div>
        </header>

        <div className="space-y-6">
          {paymentMethods.map((pm) => {
            const qrUrl = pm.qr_code_url || null
            const initial = pm.name.substring(0, 2)
            
            return (
              <article key={pm.id} className="glass-card relative overflow-hidden p-6 border-white/10">
                <header className="mb-6 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/20 border border-primary/30 text-primary font-bold uppercase tracking-wider">
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-bold text-white">{pm.name}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center rounded-md bg-neon-green/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neon-green">
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleShare(pm)}
                    type="button"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-white"
                    aria-label={`Share ${pm.name} info`}
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </header>

                  {pm.tag && (
                    <div className="mb-6 flex items-center justify-between rounded-xl bg-black/40 border border-white/5 p-4">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                          Payment Tag
                        </div>
                        <div className="font-mono text-lg text-white font-bold">{pm.tag}</div>
                      </div>
                      <button
                        onClick={() => handleCopy(pm.tag || '', pm.id)}
                        className={cn(
                          "grid h-10 w-10 shrink-0 place-items-center rounded-lg transition-all",
                          copiedId === pm.id
                            ? "bg-neon-green/20 text-neon-green"
                            : "bg-white/10 text-white hover:bg-white/20"
                        )}
                      >
                        {copiedId === pm.id ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                      </button>
                    </div>
                  )}

                  {pm.payment_link && (
                    <a
                      href={pm.payment_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-6 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3.5 px-4 font-bold transition-all hover:opacity-90 shadow-[0_0_15px_rgba(var(--primary),0.2)]"
                    >
                      <ExternalLink className="h-5 w-5" />
                      Pay with {pm.name}
                    </a>
                  )}

                {qrUrl && (
                  <button
                    type="button"
                    onClick={() => setZoomedImage(qrUrl)}
                    className="group relative mb-6 block w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-3 transition-shadow hover:bg-white/10"
                  >
                    <img
                      src={qrUrl}
                      alt={`${pm.name} QR code`}
                      width="512"
                      height="512"
                      loading="lazy"
                      className="mx-auto aspect-square w-full max-w-xs object-contain rounded-xl"
                    />
                    <div className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg bg-black/80 text-white/80 backdrop-blur-sm border border-white/10">
                      <Maximize2 className="h-4 w-4" />
                    </div>
                  </button>
                )}

                {pm.instructions && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                    <div className="mb-2 flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5 text-red-400" />
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-red-400">
                        Important Instructions
                      </h4>
                    </div>
                    <p className="whitespace-pre-line text-xs font-medium leading-relaxed text-red-100">
                      {pm.instructions}
                    </p>
                  </div>
                )}

                {pm.updated_at && (
                  <p className="mt-4 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Updated {formatDistanceToNow(new Date(pm.updated_at))} ago
                  </p>
                )}
              </article>
            )
          })}
        </div>

        <section className="mt-12 overflow-hidden rounded-3xl bg-primary/10 border border-primary/20 p-8 text-white relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent"></div>
          <div className="relative z-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight">Payment Completed?</h2>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-white/70">
              If you haven't already, please login and submit your load request with the payment screenshot.
            </p>
            <div className="mt-8 space-y-3">
              <a
                href="/load"
                className="flex items-center justify-center gap-2 rounded-2xl py-4 font-bold transition-all w-full bg-primary text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:opacity-90"
              >
                Submit Load Request
              </a>
            </div>
          </div>
        </section>

        <footer className="mt-12 mb-8 text-center pb-safe">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            Oscar Zone · Secure Portal
          </p>
        </footer>
      </div>

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setZoomedImage(null)}
        >
          <img
            src={zoomedImage}
            alt="Zoomed QR"
            className="max-h-full max-w-full rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setZoomedImage(null)}
            className="absolute top-4 right-4 text-white/50 hover:text-white"
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}