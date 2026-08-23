import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [vue()],
  // 监听所有网卡，允许局域网内其他设备通过本机 IP 访问
  server: {
    host: '0.0.0.0',
  },
})
