import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  define: {
    __TAIGA_URL__: JSON.stringify(process.env.TAIGA_URL || 'https://taiga.geofisikaugm.id')
  }
})
