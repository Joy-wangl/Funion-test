<script setup lang="ts">
/* ---------- 趋势图弹层：周期内订单量/退款率/售后单/聊天风险数/聊天风险占比（昨日/前3日/前7日/自定义） ---------- */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  DEFAULT_CUSTOM_RANGE,
  TREND_RANGE_LABELS,
  metricTrend,
  pct,
  type DateRange,
  type MetricKey,
  type ScopeTotals,
  type TrendRangeKey,
} from './qcCenterData';
import { OPT_STATUS_LABELS, type OptTask } from './qcOptData';
import Modal from '../../components/Modal.vue';
import MetricTrendChart from './MetricTrendChart.vue';
import QcDateRangePicker from './QcDateRangePicker.vue';

const METRIC_PANELS: { key: MetricKey; name: string; color: string; rate?: boolean }[] = [
  { key: 'orders', name: '订单量', color: '#4f7cff' },
  { key: 'refundRate', name: '退款率', color: '#e6455c', rate: true },
  { key: 'afterSales', name: '售后单', color: '#ff9a2e' },
  { key: 'chatRisks', name: '聊天风险数', color: '#f53f3f' },
  { key: 'chatRatio', name: '聊天风险占比', color: '#722ed1', rate: true },
];

const props = defineProps<{
  title: string;
  totals: ScopeTotals;
  /** 当前系列的优化任务（用于优化效果趋势：优化中 → 优化完成区间带） */
  optTasks: OptTask[];
  onClose: () => void;
}>();

const range = ref<TrendRangeKey>('d7');
const custom = ref<DateRange>(DEFAULT_CUSTOM_RANGE);
/** 隐藏维度（图例点击切换显隐） */
const hidden = ref<Set<string>>(new Set());
const data = computed(() => metricTrend(props.totals, range.value, custom.value));
const toggle = (key: string) => {
  const next = new Set(hidden.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  hidden.value = next;
};
const fmtOf = (m: { rate?: boolean }) => (m.rate ? pct : (v: number) => Math.round(v).toLocaleString());
/* 鼠标滚轮切换时间范围（昨日/前3日/前7日 循环；自定义仅手动点选） */
const bodyRef = ref<HTMLDivElement | null>(null);
let lastWheel = 0;
const onWheel = (e: WheelEvent) => {
  e.preventDefault();
  const now = Date.now();
  if (now - lastWheel < 260) return;
  lastWheel = now;
  const order: TrendRangeKey[] = ['yesterday', 'd3', 'd7'];
  const prev = range.value;
  const idx = prev === 'custom' ? 2 : order.indexOf(prev);
  range.value = order[(idx + (e.deltaY > 0 ? 1 : 2)) % order.length];
};
onMounted(() => bodyRef.value?.addEventListener('wheel', onWheel, { passive: false }));
onBeforeUnmount(() => bodyRef.value?.removeEventListener('wheel', onWheel));
/* 优化过程记录：进入优化中即有起点，提交审核/完结后有终点；区间带叠加在各指标趋势上展示优化效果 */
const optRecords = computed(() => props.optTasks.filter((t) => t.optStartAt));
const bands = computed(() => optRecords.value.map((t) => ({
  start: t.optStartAt as string,
  end: t.optEndAt,
  label: t.optDirection,
  color: OPT_STATUS_LABELS.find((s) => s.key === t.status)?.color ?? '#4f7cff',
})));
const chartSeries = computed(() => METRIC_PANELS.map((m) => ({
  key: m.key,
  name: m.name,
  color: m.color,
  points: data.value.series[m.key],
  format: fmtOf(m),
  axis: m.rate ? ('right' as const) : ('left' as const),
})));
const fmtDay = (d: string) => d.slice(5).replace('-', '/');
</script>

<template>
  <Modal
    title="趋势图"
    :sub="title"
    size="xl"
    @close="props.onClose"
  >
    <div ref="bodyRef">
      <div class="mt-head">
        <div class="mt-legend">
          <button
            v-for="m in METRIC_PANELS"
            :key="m.key"
            type="button"
            class="mt-chip"
            :class="hidden.has(m.key) ? 'off' : ''"
            :title="hidden.has(m.key) ? `显示「${m.name}」` : `隐藏「${m.name}」`"
            @click="toggle(m.key)"
          >
            <i :style="{ background: hidden.has(m.key) ? '#d5d9e0' : m.color }" />
            {{ m.name }}
            <b>{{ fmtOf(m)(data.sums[m.key]) }}</b>
          </button>
        </div>
        <div class="mt-range">
          <span class="mt-wheel-tip">滚轮切换时间范围</span>
          <div class="qc-range-toggle">
            <button
              v-for="r in TREND_RANGE_LABELS"
              :key="r.key"
              type="button"
              :class="range === r.key ? 'active' : ''"
              @click="range = r.key"
            >
              {{ r.label }}
            </button>
          </div>
          <QcDateRangePicker v-if="range === 'custom'" :custom="custom" :on-change="(d) => (custom = d)" />
        </div>
      </div>
      <div class="mt-chart-card">
        <MetricTrendChart
          :labels="data.labels"
          :series="chartSeries"
          :hidden="hidden"
          :bands="bands"
        />
        <div v-if="optRecords.length > 0" class="mt-opt-list">
          <div v-for="t in optRecords" :key="t.id" class="mt-opt-item">
            <i class="type-dot" :style="{ background: OPT_STATUS_LABELS.find((s) => s.key === t.status)?.color }" />
            <span class="dir">{{ t.optDirection }}</span>
            <span class="typ">{{ t.optType }}</span>
            <span class="period">{{ fmtDay(t.optStartAt as string) }} → {{ t.optEndAt ? fmtDay(t.optEndAt) : '进行中' }}</span>
            <span class="st">{{ OPT_STATUS_LABELS.find((s) => s.key === t.status)?.label }}</span>
          </div>
        </div>
      </div>
    </div>
    <template #foot>
      <button class="btn" @click="props.onClose">关闭</button>
    </template>
  </Modal>
</template>
