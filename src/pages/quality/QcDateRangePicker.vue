<script setup lang="ts">
/* ---------- 自定义日期区间：点击触发器弹出日期组件（看板与筛选表单共用） ---------- */
import { onBeforeUnmount, ref, watch } from 'vue';
import { DEFAULT_CUSTOM_RANGE, type DateRange } from './qcCenterData';

const props = defineProps<{
  custom: DateRange;
  onChange: (d: DateRange) => void;
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
</script>

<template>
  <div ref="boxRef" class="qc-date-picker">
    <button type="button" class="qc-date-trigger" @click="open = !open">
      {{ custom.start }}
      <span>→</span>
      {{ custom.end }}
    </button>
    <div v-if="open" class="qc-date-pop qc-date-range">
      <input
        type="date"
        class="sg-input"
        :value="custom.start"
        :min="DEFAULT_CUSTOM_RANGE.start"
        :max="DEFAULT_CUSTOM_RANGE.end"
        @change="props.onChange({ ...custom, start: ($event.target as HTMLInputElement).value })"
      >
      <span>→</span>
      <input
        type="date"
        class="sg-input"
        :value="custom.end"
        :min="DEFAULT_CUSTOM_RANGE.start"
        :max="DEFAULT_CUSTOM_RANGE.end"
        @change="props.onChange({ ...custom, end: ($event.target as HTMLInputElement).value })"
      >
    </div>
  </div>
</template>
