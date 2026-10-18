<script setup lang="ts">
/* ---------- 趋势图弹层：总览维度（五指标）/ 售后 / 评价 / 聊天风险维度（大类问题类型趋势）· 昨日/前3日/前7日/自定义 ---------- */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  DATE_AXIS,
  DEFAULT_CUSTOM_RANGE,
  PROBLEM_TYPE_COLOR,
  TREND_RANGE_LABELS,
  countTrend,
  metricTrend,
  pct,
  trendWindowOf,
  type DateRange,
  type MetricKey,
  type ScopeTotals,
  type TrendRangeKey,
} from './qcCenterData';
import { onlineAfterOrdersOf, onlineReviewsOf, onlineSeries, onlineSessionsOf, REVIEW_MISS_TYPE } from './qcOnlineData';
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

/** 维度：总览=五指标；其余三维度展示该场景命中大类的问题类型趋势 */
const DIMS = [
  { key: 'overview', label: '总览' },
  { key: 'after', label: '售后' },
  { key: 'review', label: '评价' },
  { key: 'chat', label: '聊天风险' },
] as const;
type DimKey = (typeof DIMS)[number]['key'];

const props = defineProps<{
  title: string;
  totals: ScopeTotals;
  onClose: () => void;
  /** 品控-线上：提供系列编码时展示维度切换 */
  seriesCode?: string;
  online?: boolean;
  /** 商品维度：命中大类计数（售后/评价/聊天风险维度趋势源，替代系列记录口径） */
  goodTypes?: { type: string; count: number }[];
  /** 商品维度：优化任务周期（图上区间色带，看优化是否有成效）；openEnd＝放宽售后·达到指标后结束（色带画到窗口末） */
  optRange?: { start: string; end: string; openEnd?: boolean } | null;
}>();

const dim = ref<DimKey>('overview');
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
watch(dim, () => { hidden.value = new Set(); });
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

/* ---------- 维度序列：总览=五指标；售后/评价/聊天风险=该场景命中大类计数趋势 ---------- */
const series = computed(() => (props.online && props.seriesCode ? onlineSeries().find((s) => s.seriesCode === props.seriesCode) ?? null : null));
/** 维度切换条：系列维度或商品维度（自带命中大类）才展示 */
const hasDims = computed(() => !!series.value || !!props.goodTypes?.length);
const typeCounts = computed(() => {
  if (dim.value === 'overview') return [] as { type: string; count: number }[];
  /* 商品维度：命中大类计数直给（与列表命中 chips 同口径） */
  if (props.goodTypes?.length) return [...props.goodTypes].sort((a, b) => b.count - a.count);
  const s = series.value;
  if (!s) return [] as { type: string; count: number }[];
  const m = new Map<string, number>();
  if (dim.value === 'chat') onlineSessionsOf(s).forEach((x) => x.hits.forEach((h) => m.set(h.type, (m.get(h.type) ?? 0) + 1)));
  else if (dim.value === 'after') onlineAfterOrdersOf(s).forEach((o) => m.set(o.ptype, (m.get(o.ptype) ?? 0) + 1));
  else onlineReviewsOf(s).forEach((r) => { if (r.ptype !== REVIEW_MISS_TYPE) m.set(r.ptype, (m.get(r.ptype) ?? 0) + 1); });
  return [...m.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
});
const seedOf = (name: string) => [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 7;
const typeSeries = computed(() => typeCounts.value.map((t) => ({
  key: t.type,
  name: t.type,
  color: PROBLEM_TYPE_COLOR[t.type] || '#4f7cff',
  points: countTrend(t.count, range.value, custom.value, seedOf(t.type)).points,
  format: (v: number) => Math.round(v).toLocaleString(),
  axis: 'left' as const,
})));
const metricSeries = computed(() => METRIC_PANELS.map((m) => ({
  key: m.key,
  name: m.name,
  color: m.color,
  points: data.value.series[m.key],
  format: fmtOf(m),
  axis: m.rate ? ('right' as const) : ('left' as const),
})));
const activeSeries = computed(() => (dim.value === 'overview' ? metricSeries.value : typeSeries.value));
const legendChips = computed(() => activeSeries.value.map((s) => ({
  key: s.key,
  name: s.name,
  color: s.color,
  fmt: s.format,
  sum: s.points.reduce((a, b) => a + b, 0),
})));

/* ---------- 优化任务区间色带：周期与当前时间窗求交（逐日=标签下标；逐时=单日落在周期内则全宽） ---------- */
const band = computed(() => {
  const t = props.optRange;
  if (!t) return null;
  const fmt = (d: string) => d.slice(5).replace('-', '/');
  const text = `优化任务 ${fmt(t.start)}~${t.openEnd ? '至今' : fmt(t.end)}`;
  const [wi0, wi1] = trendWindowOf(range.value, custom.value);
  if (wi0 === wi1) {
    const day = DATE_AXIS[wi0];
    return day >= t.start && (t.openEnd || day <= t.end) ? { i0: 0, i1: 23, text } : null;
  }
  let i0 = -1;
  let i1 = -1;
  for (let i = wi0; i <= wi1; i++) {
    const d = DATE_AXIS[i];
    if (i0 < 0 && d >= t.start) i0 = i - wi0;
    if (t.openEnd || d <= t.end) i1 = i - wi0;
  }
  if (i0 < 0 || i1 < 0 || i0 > i1) return null;
  return { i0, i1, text };
});
</script>

<template>
  <Modal
    title="趋势图"
    :sub="title"
    size="xl"
    @close="props.onClose"
  >
    <div ref="bodyRef">
      <div class="mt-sub-bar">
        <div v-if="hasDims" class="qc-range-toggle mt-dim-tabs">
          <button
            v-for="d in DIMS"
            :key="d.key"
            type="button"
            :class="dim === d.key ? 'active' : ''"
            @click="dim = d.key"
          >{{ d.label }}</button>
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
      <div class="mt-head">
        <div class="mt-legend">
          <button
            v-for="c in legendChips"
            :key="c.key"
            type="button"
            class="mt-chip"
            :class="hidden.has(c.key) ? 'off' : ''"
            :title="hidden.has(c.key) ? `显示「${c.name}」` : `隐藏「${c.name}」`"
            @click="toggle(c.key)"
          >
            <i :style="{ background: hidden.has(c.key) ? '#d5d9e0' : c.color }" />
            <span class="mt-chip-name">{{ c.name }}</span>
            <b>{{ c.fmt(c.sum) }}</b>
          </button>
        </div>
      </div>
      <div class="mt-chart-card">
        <MetricTrendChart
          :labels="data.labels"
          :series="activeSeries"
          :hidden="hidden"
          :band="band"
        />
      </div>
    </div>
    <template #foot>
      <button class="btn" @click="props.onClose">关闭</button>
    </template>
  </Modal>
</template>
