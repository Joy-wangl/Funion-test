<script setup lang="ts">
/* 小图标（1:1 移植自 AppCenter.tsx 的 Svg） */
withDefaults(defineProps<{
  d: string;
  size?: number;
  className?: string;
  filled?: boolean;
  vb?: string;
}>(), {
  size: 14,
  className: '',
  filled: false,
  vb: '0 0 24 24',
});
</script>

<template>
  <svg
    :class="className"
    :width="size"
    :height="size"
    :viewBox="vb"
    :fill="filled ? 'currentColor' : 'none'"
    stroke="currentColor"
    :stroke-width="filled ? 0 : 2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="d" />
  </svg>
</template>
