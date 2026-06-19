import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** Vite configuration for the Piano App SPA. */
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
