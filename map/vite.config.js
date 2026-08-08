import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves this repo at /impact.lab.wlg.team-1.2026-08-08/, so built
// asset URLs need that prefix. Preview uses it too, to serve what actually ships.
// The dev server stays at / so `npm run dev` opens on a plain localhost root.
const PAGES_BASE = '/impact.lab.wlg.team-1.2026-08-08/'

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? PAGES_BASE : '/',
  plugins: [react()],
}))
