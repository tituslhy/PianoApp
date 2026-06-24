/// <reference types="vite-plugin-pwa/client" />
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import { App } from './App.tsx'
import { initTheme } from './hooks/useTheme'

initTheme()

/** Registers the service worker; updates apply silently (registerType: 'autoUpdate'), no prompt UI. */
registerSW({ onOfflineReady() {} })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
