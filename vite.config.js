import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  base: "/taiga-summarize-sprint/",
  plugins: [vue()],
  define: {
    __TAIGA_URL__: JSON.stringify(process.env.TAIGA_URL || 'https://taiga.geofisikaugm.id')
  }
})
