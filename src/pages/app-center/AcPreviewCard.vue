<script setup lang="ts">
/* 应用主图预览卡（1:1 移植自 AppCenter.tsx 的 PreviewCard） */
import type { Preview } from './data';

defineProps<{ p: Preview }>();
</script>

<template>
  <div :class="`ap-preview hue-${p.hue}`">
    <span class="ap-preview-title">{{ p.title }}</span>
    <span class="ap-preview-sub">{{ p.sub }}</span>
  </div>
</template>
