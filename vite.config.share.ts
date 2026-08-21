import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

/* 独立展示页构建配置：仅打包品控中心完整功能；
   禁用 CSS 压缩以绕开本机缺失的 lightningcss 原生模块 */
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-share',
    emptyOutDir: true,
    cssMinify: false,
    rollupOptions: {
      input: resolve(process.cwd(), 'scripts/share-index.html'),
    },
  },
});
