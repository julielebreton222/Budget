import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base so the same build works on GitHub Pages (/budget/) and Vercel (/).
export default defineConfig({
  base: './',
  plugins: [react()],
})
