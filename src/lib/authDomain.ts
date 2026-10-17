/**
 * Resolves the auth domain dynamically based on the current window hostname.
 * E.g., if on natashasweeps.com -> 'users.natashasweeps.com'
 * E.g., if on oscarzone.com -> 'users.oscarzone.com'
 */
export function getAuthDomain(): string {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname.replace(/^www\./, '').toLowerCase()
    const isIpOrLocal =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      /^(\d{1,3}\.){3}\d{1,3}$/.test(host) ||
      host.endsWith('.local')

    if (host && !isIpOrLocal) {
      return `users.${host}`
    }
  }
  return import.meta.env.VITE_AUTH_DOMAIN || 'users.oscarzone.com'
}

/**
 * Returns candidate domains for username-based login resolution.
 */
export function getCandidateAuthDomains(): string[] {
  const current = getAuthDomain()
  const domains = [current]
  const defaultDomain = import.meta.env.VITE_AUTH_DOMAIN || 'users.oscarzone.com'
  
  if (!domains.includes(defaultDomain)) {
    domains.push(defaultDomain)
  }
  if (!domains.includes('users.oscarzone.com')) {
    domains.push('users.oscarzone.com')
  }
  return domains
}
