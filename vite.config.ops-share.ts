import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';

/* 独立展示页构建配置：仅打包智能运营中心完整功能；
   禁用 CSS 压缩以绕开本机缺失的 lightningcss 原生模块 */
export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist-ops',
    emptyOutDir: true,
    cssMinify: false,
    rollupOptions: {
      input: resolve(process.cwd(), 'scripts/ops-index.html'),
    },
  },
});
