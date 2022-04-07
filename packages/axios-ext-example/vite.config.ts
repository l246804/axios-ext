import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api': 'https://www.fastmock.site/mock/9f00454804589fac6a7f595c559d2ab8'
    }
  },
  plugins: [vue()]
})
