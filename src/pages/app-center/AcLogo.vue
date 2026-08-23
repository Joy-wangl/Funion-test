<script setup lang="ts">
/* 应用 Logo（1:1 移植自 AppCenter.tsx 的 Logo） */
import type { IconSpec } from './data';

withDefaults(defineProps<{
  icon: IconSpec;
  size?: number;
}>(), {
  size: 44,
});
</script>

<template>
  <span
    class="ap-logo"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      background: icon.bg,
      fontSize: `${size * 0.42}px`,
      color: icon.c ?? '#fff',
      borderRadius: `${size * 0.24}px`,
    }"
  >
    {{ icon.g }}
  </span>
</template>
