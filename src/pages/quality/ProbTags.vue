<script setup lang="ts">
/* ---------- 命中问题类型：按数量降序最多展示三行（同监控列表行级口径），超出折叠 +N，悬浮气泡展示剩余 ---------- */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps<{ hits: [string, number][] }>();
const tagCls = (t: string) => `tag ${t === '质量问题' ? 'red' : t === '描述不符' ? 'orange' : ''}`;
/* 最多展示三行：按实际换行测量，末行留一位给 +N（+N 窄于任何类型芯片，留位必放得下），同 QcSeriesRow 口径 */
const HITS_MAX_ROWS = 3;
const wrap = ref<HTMLElement | null>(null);
const limit = ref<number | null>(null);
const shown = computed(() => (limit.value == null ? props.hits : props.hits.slice(0, limit.value)));
const rest = computed(() => (limit.value == null ? [] : props.hits.slice(limit.value)));
const measure = () => {
  const el = wrap.value;
  if (!el || limit.value != null) return;
  const chips = [...el.children] as HTMLElement[];
  const tops = [...new Set(chips.map((c) => c.offsetTop))].sort((a, b) => a - b);
  if (tops.length <= HITS_MAX_ROWS) return;
  const inRows = chips.filter((c) => c.offsetTop <= tops[HITS_MAX_ROWS - 1]).length;
  limit.value = Math.max(inRows - 1, 1);
};
const reset = () => { limit.value = null; nextTick(measure); };
watch(() => props.hits, reset, { immediate: true });
onMounted(() => window.addEventListener('resize', reset));
onBeforeUnmount(() => window.removeEventListener('resize', reset));
</script>

<template>
  <div ref="wrap" class="prob-tags">
    <span v-for="[t, n] in shown" :key="t" :class="tagCls(t)">{{ t }} {{ n }}</span>
    <span v-if="rest.length > 0" class="tag prob-more hit-more">
      +{{ rest.length }}
      <span class="prob-bubble">
        <span v-for="[t, n] in rest" :key="t" :class="tagCls(t)">{{ t }} {{ n }}</span>
      </span>
    </span>
  </div>
</template>
