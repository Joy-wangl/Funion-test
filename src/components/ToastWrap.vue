<script setup lang="ts">
import { toasts } from './toast';
import '../pages/permission/style.css';
</script>

<template>
  <div class="toast-wrap">
    <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type">
      <span class="ic">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></svg>
      </span>
      <span>{{ t.msg }}</span>
    </div>
  </div>
</template>
