import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // <-- 1. Tambahkan import ini

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // <-- 2. Panggil di dalam sini
  ],
})