<script setup lang="ts">
/* ---------- 问题趋势：多系列平滑面积图 + 订单量对照曲线（右轴） + 底部图例 ---------- */
import { computed, ref } from 'vue';

const props = defineProps<{
  labels: string[];
  series: { type: string; color: string; points: number[] }[];
  /** 订单量对照序列（与 labels 对齐，右轴刻度） */
  orders?: number[];
}>();

const hidden = ref<Set<string>>(new Set());
const hideOrders = ref(false);
const toggle = (type: string) => {
  const next = new Set(hidden.value);
  if (next.has(type)) next.delete(type);
  else next.add(type);
  hidden.value = next;
};
const W = 960;
const H = 300;
const L = 48;
const R = 48;
const T = 14;
const B = 34;
const n = computed(() => props.labels.length);
const visible = computed(() => props.series.filter((s) => !hidden.value.has(s.type)));
const showOrders = computed(() => !!props.orders && !hideOrders.value);
const yMax = computed(() => niceMax(Math.max(...visible.value.flatMap((s) => s.points), 1) * 1.05));
const oMax = computed(() => (showOrders.value && props.orders ? niceMax(Math.max(...props.orders, 1) * 1.05) : 0));
const x = (i: number) => L + (i * (W - L - R)) / Math.max(n.value - 1, 1);
const y = (v: number) => T + (1 - v / yMax.value) * (H - T - B);
const yO = (v: number) => T + (1 - v / oMax.value) * (H - T - B);
const ticks = computed(() => [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * yMax.value)));
const oTicks = computed(() => [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * oMax.value)));
const step = computed(() => Math.max(1, Math.ceil(n.value / 7)));
const ordersPath = computed(() => (props.orders ? smoothPath(props.orders.map((v, i) => ({ x: x(i), y: yO(v) }))) : ''));

/* ---------- 平滑路径（Catmull-Rom → 贝塞尔） ---------- */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (!pts.length) return '';
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function niceMax(v: number): number {
  const p = 10 ** Math.floor(Math.log10(v));
  const u = v / p;
  const m = u <= 1 ? 1 : u <= 2 ? 2 : u <= 5 ? 5 : 10;
  return m * p;
}
</script>

<template>
  <div>
    <svg :viewBox="`0 0 ${W} ${H}`" class="trend-svg">
      <g v-for="t in ticks" :key="t">
        <line :x1="L" :x2="W - R" :y1="y(t)" :y2="y(t)" stroke="#edf0f5" stroke-dasharray="3 4" />
        <text :x="L - 8" :y="y(t) + 3" text-anchor="end" class="ax">{{ t }}</text>
      </g>
      <template v-if="showOrders">
        <text v-for="t in oTicks" :key="`o-${t}`" :x="W - R + 8" :y="yO(t) + 3" text-anchor="start" class="ax ax-right">{{ t }}</text>
        <path
          v-if="orders"
          :d="ordersPath"
          fill="none"
          stroke="#232b3a"
          stroke-width="1.6"
          stroke-dasharray="5 4"
          opacity="0.75"
        />
      </template>
      <g v-for="s in visible" :key="s.type">
        <path
          :d="`${smoothPath(s.points.map((v, i) => ({ x: x(i), y: y(v) })))} L${x(n - 1).toFixed(1)},${(H - B).toFixed(1)} L${x(0).toFixed(1)},${(H - B).toFixed(1)} Z`"
          :fill="s.color"
          opacity="0.12"
        />
        <path :d="smoothPath(s.points.map((v, i) => ({ x: x(i), y: y(v) })))" fill="none" :stroke="s.color" stroke-width="2" />
      </g>
      <template v-for="(lb, i) in labels" :key="`${lb}-${i}`">
        <text v-if="i % step === 0 || i === n - 1" :x="x(i)" :y="H - 10" text-anchor="middle" class="ax">{{ lb }}</text>
      </template>
    </svg>
    <div class="trend-legend-bottom">
      <span
        v-if="orders"
        class="tl-item"
        :class="{ off: hideOrders }"
        :title="hideOrders ? '显示「订单量」' : '隐藏「订单量」'"
        @click="hideOrders = !hideOrders"
      >
        <i class="dash" :style="{ background: hideOrders ? '#d5d9e0' : '#232b3a' }" />
        订单量（右轴）
      </span>
      <span
        v-for="s in series"
        :key="s.type"
        class="tl-item"
        :class="{ off: hidden.has(s.type) }"
        :title="hidden.has(s.type) ? `显示「${s.type}」` : `隐藏「${s.type}」`"
        @click="toggle(s.type)"
      >
        <i :style="{ background: hidden.has(s.type) ? '#d5d9e0' : s.color }" />
        {{ s.type }}
      </span>
    </div>
  </div>
</template>
