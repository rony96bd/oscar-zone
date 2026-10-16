import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyStoredPwaManifest } from './lib/pwaManifest'

// Phase 1: Immediately restore the dynamic PWA manifest from the previous
// session's localStorage cache. This runs before React renders and before
// Chrome's PWA installability check, so the install prompt shows the correct
// site logo (e.g. NatashaSweeps instead of OscarZone) on desktop too.
applyStoredPwaManifest()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
