<script setup lang="ts">
/* 自定义日期区间：点击触发器弹出日期组件（与品控趋势图交互一致）—— 1:1 移植自 Dashboard.tsx */
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { iso } from './dashUtil';

const props = defineProps<{
  value: { start: string; end: string };
  onChange: (v: { start: string; end: string }) => void;
}>();

const open = ref(false);
const boxRef = ref<HTMLDivElement | null>(null);

const onDoc = (e: MouseEvent) => {
  if (boxRef.value && !boxRef.value.contains(e.target as Node)) open.value = false;
};
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') open.value = false; };

watch(open, (v) => {
  if (v) {
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
  } else {
    document.removeEventListener('mousedown', onDoc);
    document.removeEventListener('keydown', onKey);
  }
});
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDoc);
  document.removeEventListener('keydown', onKey);
});

const max = iso(new Date());
const minD = new Date();
minD.setDate(minD.getDate() - 89);
const min = iso(minD);

const startVal = computed(() => props.value.start);
const endVal = computed(() => props.value.end);
</script>

<template>
  <div ref="boxRef" class="ap-date-picker">
    <button type="button" class="ap-date-trigger" @click="open = !open">
      {{ value.start }}
      <span>→</span>
      {{ value.end }}
    </button>
    <div v-if="open" class="ap-date-pop">
      <input type="date" :value="startVal" :min="min" :max="max" @change="onChange({ ...value, start: ($event.target as HTMLInputElement).value })">
      <span>→</span>
      <input type="date" :value="endVal" :min="min" :max="max" @change="onChange({ ...value, end: ($event.target as HTMLInputElement).value })">
    </div>
  </div>
</template>
