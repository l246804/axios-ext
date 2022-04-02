import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

const resolveRoot = (...paths) => resolve(__dirname, '..', ...paths)

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@iel/axios-extension': resolveRoot('src/index.ts')
    }
  },
  server: {
    proxy: {
      '/api': 'https://www.fastmock.site/mock/9f00454804589fac6a7f595c559d2ab8'
    }
  },
  plugins: [vue()]
})
