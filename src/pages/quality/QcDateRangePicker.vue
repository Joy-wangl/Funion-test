<script setup lang="ts">
/* ---------- 自定义日期区间：点击触发器弹出日期组件（看板与筛选表单共用） ---------- */
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { DEFAULT_CUSTOM_RANGE, type DateRange } from './qcCenterData';

const props = defineProps<{
  custom: DateRange;
  onChange: (d: DateRange) => void;
  /** 可选日期边界（缺省近30天轴；系列详情抽屉按证据数据跨度传入） */
  min?: string;
  max?: string;
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

/* ---------- Ant 风格月历区间：单月网格 + 月导航 + 点选起止闭环（取代原生 date 输入） ---------- */
const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const WEEK_HEAD = ['日', '一', '二', '三', '四', '五', '六'];
const boundMin = computed(() => props.min ?? DEFAULT_CUSTOM_RANGE.start);
const boundMax = computed(() => props.max ?? DEFAULT_CUSTOM_RANGE.end);
const viewY = ref(Number(props.custom.start.slice(0, 4)));
const viewM = ref(Number(props.custom.start.slice(5, 7)) - 1);
/* 点选中的起点（尚未选终点时为 null→已选起点待终点） */
const selStart = ref<string | null>(null);
watch(open, (v) => {
  if (v) {
    viewY.value = Number(props.custom.start.slice(0, 4));
    viewM.value = Number(props.custom.start.slice(5, 7)) - 1;
    selStart.value = null;
  }
});
const viewLabel = computed(() => `${viewY.value} 年 ${viewM.value + 1} 月`);
const navMonth = (d: number) => {
  let m = viewM.value + d;
  let y = viewY.value;
  if (m < 0) { m = 11; y--; }
  if (m > 11) { m = 0; y++; }
  viewM.value = m;
  viewY.value = y;
};
/* 月格：首日前留空 + 当月各日 ISO；周日起始 */
const cells = computed((): (string | null)[] => {
  const lead = new Date(viewY.value, viewM.value, 1).getDay();
  const days = new Date(viewY.value, viewM.value + 1, 0).getDate();
  const out: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) out.push(fmt(viewY.value, viewM.value, d));
  return out;
});
const isOff = (iso: string) => iso < boundMin.value || iso > boundMax.value;
const dispStart = computed(() => selStart.value ?? props.custom.start);
const dispEnd = computed(() => (selStart.value ? null : props.custom.end));
const onDay = (iso: string) => {
  if (isOff(iso)) return;
  if (!selStart.value) { selStart.value = iso; return; }
  let a = selStart.value;
  let b = iso;
  if (a > b) { const t = a; a = b; b = t; }
  selStart.value = null;
  open.value = false;
  props.onChange({ start: a, end: b });
};
</script>

<template>
  <div ref="boxRef" class="qc-date-picker">
    <button type="button" class="qc-date-trigger" @click="open = !open">
      {{ custom.start }}
      <span>→</span>
      {{ custom.end }}
    </button>
    <div v-if="open" class="qc-date-pop qc-cal">
      <div class="qc-cal-head">
        <button type="button" class="qc-cal-nav" title="上一月" @click="navMonth(-1)">‹</button>
        <span class="qc-cal-title">{{ viewLabel }}</span>
        <button type="button" class="qc-cal-nav" title="下一月" @click="navMonth(1)">›</button>
      </div>
      <div class="qc-cal-week">
        <span v-for="w in WEEK_HEAD" :key="w">{{ w }}</span>
      </div>
      <div class="qc-cal-grid">
        <template v-for="(c, i) in cells" :key="i">
          <span v-if="!c" class="qc-cal-blank" />
          <button
            v-else
            type="button"
            class="qc-cal-day"
            :class="{ off: isOff(c), start: c === dispStart, end: c === dispEnd, in: !!dispStart && !!dispEnd && c > dispStart && c < dispEnd }"
            @click="onDay(c)"
          >{{ Number(c.slice(8)) }}</button>
        </template>
      </div>
      <div class="qc-cal-foot">{{ selStart ? `起点 ${selStart} · 请选择终点` : `${custom.start} → ${custom.end}` }}</div>
    </div>
  </div>
</template>
