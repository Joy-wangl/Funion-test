<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  text: string;
  className?: string;
  style?: Record<string, string | number>;
}>();

const wrapRef = ref<HTMLSpanElement | null>(null);
const innerRef = ref<HTMLSpanElement | null>(null);
const tip = ref<{ x: number; y: number } | null>(null);

const onEnter = () => {
  const el = innerRef.value;
  const wrap = wrapRef.value;
  if (!el || !wrap || el.scrollWidth <= el.clientWidth) return;
  const r = wrap.getBoundingClientRect();
  /* fixed 定位 + Teleport 渲染，任何 overflow 容器都不裁切 */
  tip.value = { x: Math.max(8, Math.min(r.left, window.innerWidth - 376)), y: r.bottom + 6 };
};
</script>

<template>
  <span
    ref="wrapRef"
    class="ell-wrap"
    :class="className"
    :style="style"
    @mouseenter="onEnter"
    @mouseleave="tip = null"
  >
    <span ref="innerRef" class="ell-inner">{{ text }}</span>
    <Teleport to="body">
      <span v-if="tip" class="ell-tip" :style="{ left: `${tip.x}px`, top: `${tip.y}px` }">{{ text }}</span>
    </Teleport>
  </span>
</template>
