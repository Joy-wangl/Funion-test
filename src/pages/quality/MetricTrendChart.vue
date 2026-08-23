<script lang="ts">
export type OptBand = {
  /** 优化开始日期（YYYY-MM-DD） */
  start: string;
  /** 优化完成日期；缺省=进行中，带延伸至右缘 */
  end?: string;
  label: string;
  color: string;
};

export interface MetricSeriesDef {
  key: string;
  name: string;
  color: string;
  points: number[];
  format: (v: number) => string;
  /** 左轴=计数类 / 右轴=比率类 */
  axis: 'left' | 'right';
}
</script>

<script setup lang="ts">
/* ---------- 指标趋势大图（趋势图弹层：多维度双轴曲线 · 图例显隐 · 悬浮气泡多行数值） ---------- */
import { computed, ref } from 'vue';

const props = defineProps<{
  labels: string[];
  /** 全部维度序列（显隐由 hidden 控制） */
  series: MetricSeriesDef[];
  /** 隐藏的维度 key（图例点击切换） */
  hidden: Set<string>;
  /** 优化过程区间带（优化中 → 优化完成） */
  bands?: OptBand[];
}>();

const hover = ref<{ i: number; px: number; py: number } | null>(null);
const wrapRef = ref<HTMLDivElement | null>(null);
const W = 1000;
const H = 340;
const L = 56;
const R = 56;
const T = 18;
const B = 36;
const n = computed(() => props.labels.length);
const visible = computed(() => props.series.filter((s) => !props.hidden.has(s.key)));
const lefts = computed(() => visible.value.filter((s) => s.axis === 'left'));
const rights = computed(() => visible.value.filter((s) => s.axis === 'right'));
const lMax = computed(() => (lefts.value.length ? niceMax(Math.max(...lefts.value.flatMap((s) => s.points), 1e-9) * 1.1) : 0));
const rMax = computed(() => (rights.value.length ? niceMax(Math.max(...rights.value.flatMap((s) => s.points), 1e-9) * 1.1) : 0));
const x = (i: number) => (n.value === 1 ? (W - L - R) / 2 + L : L + (i * (W - L - R)) / (n.value - 1));
const yL = (v: number) => T + (1 - v / (lMax.value || 1)) * (H - T - B);
const yR = (v: number) => T + (1 - v / (rMax.value || 1)) * (H - T - B);
const yOf = (s: MetricSeriesDef) => (s.axis === 'left' ? yL : yR);
const lFmt = computed(() => lefts.value[0]?.format ?? ((v: number) => Math.round(v).toLocaleString()));
const rFmt = computed(() => rights.value[0]?.format ?? ((v: number) => `${Math.round(v * 100)}%`));
const fracs = [0, 0.25, 0.5, 0.75, 1];
const step = computed(() => Math.max(1, Math.ceil(n.value / 8)));
const onMove = (e: MouseEvent) => {
  const wrap = wrapRef.value;
  const rect = wrap?.querySelector('svg')?.getBoundingClientRect();
  if (!wrap || !rect) return;
  const fx = ((e.clientX - rect.left) / rect.width) * W;
  const i = Math.max(0, Math.min(n.value - 1, Math.round(((fx - L) / (W - L - R)) * (n.value - 1))));
  const wr = wrap.getBoundingClientRect();
  hover.value = { i, px: (x(i) / W) * rect.width, py: Math.max(8, Math.min(e.clientY - wr.top, wr.height - 8)) };
};
/* 日期 → 轴下标：标签为 MM/DD 或小时制，按 MMDD 匹配；区间带起点早于窗口时左钳制 */
const bandIdx = (d?: string) => {
  if (!d) return -1;
  const key = d.slice(5).replace(/\D/g, '');
  return props.labels.findIndex((lb) => lb.replace(/\D/g, '').slice(-4) === key);
};
/* 区间带渲染数据（起点越界钳制 / 终点缺省延伸至右缘） */
const bandRects = computed(() => (props.bands ?? []).map((b) => {
  let i0 = bandIdx(b.start);
  const i1 = bandIdx(b.end);
  if (i0 < 0 && (b.end ? i1 >= 0 : true)) i0 = 0;
  if (i0 < 0) return null;
  const x1 = x(i0);
  const x2 = i1 >= 0 ? x(i1) : W - R;
  return { x1, x2, done: i1 >= 0, color: b.color, label: b.label };
}).filter((b): b is NonNullable<typeof b> => b !== null));
const wrapW = () => wrapRef.value?.clientWidth ?? 800;

function niceMax(v: number): number {
  const p = 10 ** Math.floor(Math.log10(v));
  const u = v / p;
  const m = u <= 1 ? 1 : u <= 2 ? 2 : u <= 5 ? 5 : 10;
  return m * p;
}

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
</script>

<template>
  <div ref="wrapRef" style="position: relative">
    <svg :viewBox="`0 0 ${W} ${H}`" class="metric-trend" @mousemove="onMove" @mouseleave="hover = null">
      <g v-for="f in fracs" :key="f">
        <line :x1="L" :x2="W - R" :y1="T + (1 - f) * (H - T - B)" :y2="T + (1 - f) * (H - T - B)" stroke="#e7eaf0" stroke-dasharray="3 4" />
        <text v-if="lMax > 0" :x="L - 8" :y="T + (1 - f) * (H - T - B) + 3" text-anchor="end" class="ax">{{ lFmt(f * lMax) }}</text>
        <text v-if="rMax > 0" :x="W - R + 8" :y="T + (1 - f) * (H - T - B) + 3" text-anchor="start" class="ax ax-r">{{ rFmt(f * rMax) }}</text>
      </g>
      <text v-if="lMax > 0" :x="L" :y="T - 6" class="ax-cap">数量</text>
      <text v-if="rMax > 0" :x="W - R" :y="T - 6" text-anchor="end" class="ax-cap ax-r">比率</text>
      <g v-for="(b, bi) in bandRects" :key="bi">
        <rect :x="b.x1" :y="T" :width="Math.max(2, b.x2 - b.x1)" :height="H - T - B" :fill="b.color" opacity="0.08" />
        <line :x1="b.x1" :x2="b.x1" :y1="T" :y2="H - B" :stroke="b.color" stroke-dasharray="4 4" opacity="0.6" />
        <line v-if="b.done" :x1="b.x2" :x2="b.x2" :y1="T" :y2="H - B" :stroke="b.color" opacity="0.6" />
        <text :x="b.x1 + 4" :y="T + 10" :fill="b.color" class="band-lb">{{ b.label }}{{ b.done ? '·完成' : '·进行中' }}</text>
      </g>
      <g v-for="s in visible" :key="s.key">
        <path v-if="n > 1" :d="smoothPath(s.points.map((v, i) => ({ x: x(i), y: yOf(s)(v) })))" fill="none" :stroke="s.color" stroke-width="2.2" />
        <circle v-for="(v, i) in s.points" :key="i" :cx="x(i)" :cy="yOf(s)(v)" :r="hover?.i === i ? 4 : 2.4" :fill="s.color" />
      </g>
      <line
        v-if="hover && visible.length > 0"
        :x1="x(hover.i)"
        :x2="x(hover.i)"
        :y1="T"
        :y2="H - B"
        stroke="#8a94a6"
        stroke-dasharray="4 4"
        opacity="0.5"
      />
      <template v-for="(lb, i) in labels" :key="`${lb}-${i}`">
        <text v-if="i % step === 0 || i === n - 1" :x="x(i)" :y="H - 10" text-anchor="middle" class="ax">{{ lb }}</text>
      </template>
    </svg>
    <div v-if="visible.length === 0" class="mt-empty">已隐藏全部维度，点击上方图例恢复显示</div>
    <div
      v-if="hover && visible.length > 0"
      class="mt-tip"
      :style="{
        left: hover.px,
        top: hover.py,
        transform: hover.px > wrapW() - 190 ? 'translate(calc(-100% - 12px), -50%)' : 'translate(12px, -50%)',
      }"
    >
      <div class="mt-tip-date">{{ labels[hover.i] }}</div>
      <div v-for="s in visible" :key="s.key" class="mt-tip-line">
        <i :style="{ background: s.color }" />
        {{ s.name }}
        <b>{{ s.format(s.points[hover.i]) }}</b>
      </div>
    </div>
  </div>
</template>
