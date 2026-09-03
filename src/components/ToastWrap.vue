<script setup lang="ts">
/* 全局标准提示：横幅式 banner，四型图标（success/error/warning/info）
   样式由全局基础层 permission/style.css 的 .toast-wrap/.toast 提供；
   挂载点统一收口至 App.vue，各业务页不再单独挂载 */
import { toasts } from './toast';
</script>

<template>
  <div class="toast-wrap">
    <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type">
      <span class="ic">
        <svg v-if="t.type === 'error'" width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor" /><path d="M8.7 8.7l6.6 6.6M15.3 8.7l-6.6 6.6" stroke="#fff" stroke-width="2.2" stroke-linecap="round" /></svg>
        <svg v-else-if="t.type === 'warning'" width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor" /><path d="M12 7v6.2" stroke="#fff" stroke-width="2.2" stroke-linecap="round" /><circle cx="12" cy="16.7" r="1.4" fill="#fff" /></svg>
        <svg v-else-if="t.type === 'info'" width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor" /><circle cx="12" cy="7.4" r="1.4" fill="#fff" /><path d="M12 11v6.2" stroke="#fff" stroke-width="2.2" stroke-linecap="round" /></svg>
        <svg v-else width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor" /><path d="M7.6 12.4l3 3 6-6.8" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </span>
      <span class="msg">{{ t.msg }}</span>
    </div>
  </div>
</template>
