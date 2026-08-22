import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  // 监听所有网卡，允许局域网内其他设备通过本机 IP 访问
  server: {
    host: '0.0.0.0',
  },
})
