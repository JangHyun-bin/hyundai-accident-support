import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// `--mode native` builds the bundle the Android app serves from https://appassets.androidplatform.net/assets/web/.
export default defineConfig(({ mode }) => ({
  base: mode === 'native' ? '/assets/web/' : '/',
  build: { outDir: mode === 'native' ? 'dist-native' : 'dist' },
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
}))
