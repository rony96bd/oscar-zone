/**
 * PWA Manifest Dynamic Updater
 *
 * Replaces the static build-time PWA manifest icons with the admin-uploaded
 * site logo at runtime. This allows multiple deployments of the same codebase
 * (e.g. OscarZone and NatashaSweeps) to each show their own branding in the
 * browser's PWA install prompt.
 *
 * HOW IT WORKS (two-phase approach to fix desktop Chrome timing):
 *
 * Phase 1 — Instant (on every page load, before React renders):
 *   Reads the logo URL and site name saved in localStorage from the previous
 *   session and immediately updates the manifest link. This runs before Chrome
 *   evaluates PWA installability, so the install dialog shows the correct icon.
 *
 * Phase 2 — After settings are fetched from Supabase:
 *   Called from settingsStore once the DB response arrives. Saves the fresh
 *   values to localStorage for the next page load (Phase 1) and updates the
 *   manifest with the latest logo.
 */

const LS_LOGO_KEY = 'pwa_logo_url'
const LS_NAME_KEY = 'pwa_site_name'

/** Detect MIME type from a URL's file extension. */
function detectMimeType(url: string): string {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'svg') return 'image/svg+xml'
  return 'image/png'
}

/**
 * Core function — fetches the original static manifest as a base, then
 * overrides name + icons with the dynamic values, and replaces the
 * <link rel="manifest"> href with a blob URL containing the new manifest.
 */
export async function updatePwaManifestIcons(logoUrl: string, siteName: string): Promise<void> {
  try {
    const existingLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null
    if (!existingLink) return

    // Save original href once so we can always re-fetch the full manifest base
    if (!existingLink.getAttribute('data-original-href')) {
      const currentHref = existingLink.getAttribute('href') || ''
      if (currentHref && !currentHref.startsWith('blob:')) {
        existingLink.setAttribute('data-original-href', currentHref)
      }
    }

    const originalHref = existingLink.getAttribute('data-original-href')
    if (!originalHref) return

    // Fetch original manifest to preserve ALL required PWA fields
    // (scope, lang, orientation, description, theme_color, etc.)
    let baseManifest: Record<string, unknown> = {}
    try {
      const res = await fetch(originalHref)
      if (res.ok) baseManifest = await res.json()
      else return // Can't build a valid manifest — abort silently
    } catch {
      return // Network error — don't break the existing install prompt
    }

    const mimeType = detectMimeType(logoUrl)

    const manifestData = {
      ...baseManifest,   // preserve scope, lang, orientation, description, etc.
      name: siteName,
      short_name: siteName,
      icons: [
        { src: logoUrl, sizes: '192x192', type: mimeType },
        { src: logoUrl, sizes: '512x512', type: mimeType, purpose: 'any maskable' },
      ],
    }

    const blob = new Blob([JSON.stringify(manifestData)], { type: 'application/json' })
    const newManifestUrl = URL.createObjectURL(blob)

    // Revoke previous blob to free memory
    const prevUrl = existingLink.getAttribute('data-dynamic-src')
    if (prevUrl) URL.revokeObjectURL(prevUrl)

    existingLink.setAttribute('href', newManifestUrl)
    existingLink.setAttribute('data-dynamic-src', newManifestUrl)

    // Persist for Phase 1 on the next page load
    localStorage.setItem(LS_LOGO_KEY, logoUrl)
    localStorage.setItem(LS_NAME_KEY, siteName)
  } catch (e) {
    console.warn('Failed to update PWA manifest icons:', e)
  }
}

/**
 * Phase 1 — Call this as early as possible (before React renders) so the
 * manifest is updated before Chrome's PWA installability check fires.
 * Reads the cached logo/name from localStorage set during the previous session.
 */
export function applyStoredPwaManifest(): void {
  const logoUrl = localStorage.getItem(LS_LOGO_KEY)
  const siteName = localStorage.getItem(LS_NAME_KEY)
  if (logoUrl && siteName) {
    // Fire-and-forget — intentionally not awaited so it doesn't block rendering
    updatePwaManifestIcons(logoUrl, siteName)
  }
}
