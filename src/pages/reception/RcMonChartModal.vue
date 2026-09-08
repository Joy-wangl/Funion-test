<script lang="ts">
/* 实时监控图表弹窗作用域：公司行 / 分组头 / 客服行三维度入口 */
export type MonChartScope =
  | { kind: 'company'; company: string }
  | { kind: 'group'; company: string; group: string }
  | { kind: 'agent'; company: string; group: string; name: string; id: number };
</script>

<script setup lang="ts">
/* =========================================================
   宝妈接待 · 实时监控图表弹窗（公司/分组/客服三维度入口）
   视觉对标知识库趋势图弹窗（指标胶囊点击显隐 + 周期分段
   + 双轴平滑面积曲线 + 悬浮多行气泡），尺寸加大一档（xxl）
   功能保留源系统实时监控页：近1小时(每3分钟)/全天(每1小时) 周期、
   四序列平滑面积曲线（均响/未回复数/3分钟回复率/30秒响应率）
   ========================================================= */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import Modal from '../../components/Modal.vue';

const props = defineProps<{ scope: MonChartScope }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const subLabel = computed(() => {
  const s = props.scope;
  if (s.kind === 'company') return s.company;
  if (s.kind === 'group') return `${s.company} · ${s.group}`;
  return `${s.company} · ${s.group} · ${s.name}（ID: ${s.id}）`;
});
const scopeKey = computed(() => {
  const s = props.scope;
  if (s.kind === 'company') return s.company;
  if (s.kind === 'group') return `${s.company}::${s.group}`;
  return `${s.company}::${s.group}::${s.id}`;
});

/* ---------- 周期：近1小时(每3分钟 20 点) / 全天(自然日 0 点至当前整点) ---------- */
const RANGES = [
  { key: 'h1', label: '近1小时' },
  { key: 'day', label: '全天' },
] as const;
type RangeKey = (typeof RANGES)[number]['key'];
const range = ref<RangeKey>('h1');
const curMeta = computed(() => (range.value === 'h1'
  ? { n: 20, stepMin: 3, label: '近1小时', stepLabel: '每3分钟' }
  : { n: new Date().getHours() + 1, stepMin: 60, label: '全天', stepLabel: '每1小时' }));
const pad = (v: number) => String(v).padStart(2, '0');
const labels = computed(() => {
  const meta = curMeta.value;
  if (meta.stepMin >= 60) return Array.from({ length: meta.n }, (_, i) => `${pad(i)}:00`);
  const end = new Date();
  return Array.from({ length: meta.n }, (_, i) => {
    const t = new Date(end.getTime() - (meta.n - 1 - i) * meta.stepMin * 60000);
    return `${pad(t.getHours())}:${pad(t.getMinutes())}`;
  });
});

/* ---------- 四指标序列（种子随机，同作用域同周期稳定） ---------- */
type MetricKey = 'resp' | 'unreplied' | 'r3m' | 'r30s';
type Axis = 'left' | 'right' | 'sec';
const METRICS: { key: MetricKey; name: string; color: string; axis: Axis; fmt: (v: number) => string }[] = [
  /* 均响单位为秒，独立第三轴（左侧外列橙色刻度），不与条数/比率共轴 */
  { key: 'resp', name: '均响', color: 'var(--color-warning)', axis: 'sec', fmt: (v) => `${v.toFixed(1)}s` },
  { key: 'unreplied', name: '未回复数', color: 'var(--color-danger)', axis: 'left', fmt: (v) => `${Math.round(v)}条` },
  { key: 'r3m', name: '3分钟回复率', color: 'var(--color-success)', axis: 'right', fmt: (v) => `${Math.round(v)}%` },
  { key: 'r30s', name: '30秒响应率', color: 'var(--color-primary)', axis: 'right', fmt: (v) => `${Math.round(v)}%` },
];
const seedOf = (key: string) => {
  let h = 2166136261;
  for (const ch of key) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
const rnd = (seed: number) => {
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const BASE: Record<MetricKey, { base: number; amp: number; min: number; max: number }> = {
  resp: { base: 3.6, amp: 1.8, min: 1.2, max: 6.5 },
  unreplied: { base: 46, amp: 30, min: 8, max: 80 },
  r3m: { base: 62, amp: 18, min: 30, max: 80 },
  r30s: { base: 60, amp: 20, min: 28, max: 80 },
};
const series = computed(() => {
  const meta = curMeta.value;
  const out = {} as Record<MetricKey, number[]>;
  METRICS.forEach((m, mi) => {
    const seed = seedOf(`${scopeKey.value}|${range.value}|${m.key}`);
    const phase = rnd(seed) * Math.PI * 2;
    const cfg = BASE[m.key];
    out[m.key] = Array.from({ length: meta.n }, (_, i) => {
      const wave = 0.45 * Math.sin(i * 0.85 + phase) + 0.25 * Math.sin(i * 0.31 + phase * 2);
      const v = cfg.base + cfg.amp * (wave + (rnd(seed + i * 7 + mi) - 0.5) * 0.9);
      const c = Math.min(cfg.max, Math.max(cfg.min, v));
      return m.key === 'resp' ? Math.round(c * 10) / 10 : Math.round(c);
    });
  });
  return out;
});
const sums = computed(() => {
  const mean = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / (arr.length || 1);
  return {
    resp: METRICS[0].fmt(mean(series.value.resp)),
    unreplied: METRICS[1].fmt(series.value.unreplied.reduce((s, v) => s + v, 0)),
    r3m: METRICS[2].fmt(mean(series.value.r3m)),
    r30s: METRICS[3].fmt(mean(series.value.r30s)),
  } as Record<MetricKey, string>;
});

/* ---------- 显隐：胶囊点击切换（全显即综合口径） ---------- */
const hidden = ref<Set<MetricKey>>(new Set());
const toggle = (k: MetricKey) => {
  const next = new Set(hidden.value);
  if (next.has(k)) next.delete(k);
  else next.add(k);
  hidden.value = next;
};
const visible = computed(() => METRICS.filter((m) => !hidden.value.has(m.key)).map((m) => ({
  ...m,
  points: series.value[m.key],
})));
const caption = computed(() => {
  const meta = curMeta.value;
  const scopeTxt = hidden.value.size === 0 ? '综合' : (visible.value.map((v) => v.name).join('、') || '无指标');
  return `${scopeTxt} · ${meta.label}（${meta.stepLabel}） · ${labels.value[0]}–${labels.value[labels.value.length - 1]}`;
});

/* ---------- Esc 关闭（周期仅 tab 点击切换，不做滚轮劫持避免与点击/滚动打架） ---------- */
onMounted(() => {
  window.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey);
});
/** Esc 关闭弹窗 */
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') emit('close'); };

/* ---------- 三轴几何：左=数量（条）/ 左外=均响（s）/ 右=比率（%） ---------- */
const W = 1160;
const H = 420;
const L = 92;
const R = 56;
/* 顶部留白含轴标题行：标题与顶刻度疏开（标题基线 T-18，顶刻度基线 T+3） */
const T = 34;
const B = 36;
const lefts = computed(() => visible.value.filter((s) => s.axis === 'left'));
const rights = computed(() => visible.value.filter((s) => s.axis === 'right'));
const secs = computed(() => visible.value.filter((s) => s.axis === 'sec'));
const niceMax = (v: number) => {
  const p = 10 ** Math.floor(Math.log10(v));
  const u = v / p;
  const m = u <= 1 ? 1 : u <= 2 ? 2 : u <= 5 ? 5 : 10;
  return m * p;
};
const lMax = computed(() => (lefts.value.length ? niceMax(Math.max(...lefts.value.flatMap((s) => s.points), 1e-9) * 1.1) : 0));
const rMax = computed(() => (rights.value.length ? niceMax(Math.max(...rights.value.flatMap((s) => s.points), 1e-9) * 1.1) : 0));
/* 秒轴量程：向上取偶数整档（如 8s），刻度不出现小数 */
const sMax = computed(() => (secs.value.length ? Math.max(2, Math.ceil((Math.max(...secs.value.flatMap((s) => s.points), 1e-9) * 1.1) / 2) * 2) : 0));
const n = computed(() => labels.value.length);
const x = (i: number) => (n.value <= 1 ? L + (W - L - R) / 2 : L + (i * (W - L - R)) / (n.value - 1));
const yL = (v: number) => T + (1 - v / (lMax.value || 1)) * (H - T - B);
const yR = (v: number) => T + (1 - v / (rMax.value || 1)) * (H - T - B);
const yS = (v: number) => T + (1 - v / (sMax.value || 1)) * (H - T - B);
const yOf = (s: { axis: Axis }) => (s.axis === 'left' ? yL : s.axis === 'right' ? yR : yS);
const fracs = [0, 0.25, 0.5, 0.75, 1];
const step = computed(() => Math.max(1, Math.ceil(n.value / 8)));

/* ---------- 平滑面积曲线（图二语言）：单调三次插值，无过冲、峰不越 plot 顶线 ---------- */
const r2 = (v: number) => Math.round(v * 100) / 100;
const monoD = (pts: { x: number; y: number }[]) => {
  const cnt = pts.length;
  if (cnt < 2) return '';
  const dx: number[] = [];
  const sl: number[] = [];
  for (let i = 0; i < cnt - 1; i++) { dx.push(pts[i + 1].x - pts[i].x); sl.push((pts[i + 1].y - pts[i].y) / (dx[i] || 1)); }
  const t: number[] = [sl[0]];
  for (let i = 1; i < cnt - 1; i++) {
    if (sl[i - 1] * sl[i] <= 0) t.push(0);
    else { const w1 = 2 * dx[i] + dx[i - 1], w2 = dx[i] + 2 * dx[i - 1]; t.push((w1 + w2) / (w1 / sl[i - 1] + w2 / sl[i])); }
  }
  t.push(sl[cnt - 2]);
  let d = `M ${r2(pts[0].x)},${r2(pts[0].y)}`;
  for (let i = 0; i < cnt - 1; i++) {
    const h = dx[i] / 3;
    d += ` C ${r2(pts[i].x + h)},${r2(pts[i].y + t[i] * h)} ${r2(pts[i + 1].x - h)},${r2(pts[i + 1].y - t[i + 1] * h)} ${r2(pts[i + 1].x)},${r2(pts[i + 1].y)}`;
  }
  return d;
};
const ptsOf = (s: { points: number[]; axis: Axis }) => s.points.map((v, i) => ({ x: x(i), y: yOf(s)(v) }));
const lineD = (s: { points: number[]; axis: Axis }) => monoD(ptsOf(s));
const areaD = (s: { points: number[]; axis: Axis }) => {
  const p = ptsOf(s);
  if (p.length < 2) return '';
  return `${monoD(p)} L ${r2(p[p.length - 1].x)},${H - B} L ${r2(p[0].x)},${H - B} Z`;
};

/* ---------- 悬浮气泡 ---------- */
const hover = ref<{ i: number; px: number; py: number } | null>(null);
const wrapRef = ref<HTMLDivElement | null>(null);
const wrapW = () => wrapRef.value?.clientWidth ?? 900;
const onMove = (e: MouseEvent) => {
  const wrap = wrapRef.value;
  const rect = wrap?.querySelector('svg')?.getBoundingClientRect();
  if (!wrap || !rect) return;
  const fx = ((e.clientX - rect.left) / rect.width) * W;
  const i = Math.max(0, Math.min(n.value - 1, Math.round(((fx - L) / (W - L - R)) * (n.value - 1))));
  const wr = wrap.getBoundingClientRect();
  hover.value = { i, px: (x(i) / W) * rect.width, py: Math.max(8, Math.min(e.clientY - wr.top, wr.height - 8)) };
};
</script>

<template>
  <Modal title="实时监控" :sub="subLabel" size="xxl" @close="emit('close')">
    <div class="rc-monchart">
      <!-- 指标胶囊（点击显隐 + 区间汇总值） + 周期分段（点击切换） -->
      <div class="rc-monchart-head">
        <div class="rc-monchart-chips">
          <button
            v-for="m in METRICS"
            :key="m.key"
            type="button"
            class="rc-monchart-chip"
            :class="{ off: hidden.has(m.key) }"
            :title="hidden.has(m.key) ? `显示「${m.name}」` : `隐藏「${m.name}」`"
            @click="toggle(m.key)"
          >
            <i :style="{ background: hidden.has(m.key) ? 'var(--color-text-4)' : m.color }" />
            {{ m.name }}
            <b>{{ sums[m.key] }}</b>
          </button>
        </div>
        <div class="rc-monchart-range">
          <div class="rc-monchart-seg">
            <button
              v-for="r in RANGES"
              :key="r.key"
              type="button"
              :class="{ active: range === r.key }"
              @click="range = r.key"
            >{{ r.label }}</button>
          </div>
        </div>
      </div>

      <!-- 双轴平滑面积曲线 + 悬浮多行气泡；口径文案独立成行，曲线区域不遮文字 -->
      <div class="rc-monchart-card">
        <span class="rc-monchart-cap">{{ caption }}</span>
        <div ref="wrapRef" class="rc-monchart-wrap">
          <svg :viewBox="`0 0 ${W} ${H}`" class="rc-monchart-svg" @mousemove="onMove" @mouseleave="hover = null">
            <g v-for="f in fracs" :key="f">
              <line :x1="L" :x2="W - R" :y1="T + (1 - f) * (H - T - B)" :y2="T + (1 - f) * (H - T - B)" stroke="var(--color-border-2)" stroke-dasharray="3 4" />
              <text v-if="sMax > 0" :x="44" :y="T + (1 - f) * (H - T - B) + 3" text-anchor="end" class="ax ax-s">{{ Math.round(f * sMax * 10) / 10 }}</text>
              <text v-if="lMax > 0" :x="L - 8" :y="T + (1 - f) * (H - T - B) + 3" text-anchor="end" class="ax">{{ Math.round(f * lMax) }}</text>
              <text v-if="rMax > 0" :x="W - R + 8" :y="T + (1 - f) * (H - T - B) + 3" text-anchor="start" class="ax ax-r">{{ Math.round(f * rMax) }}%</text>
            </g>
            <text v-if="sMax > 0" :x="44" :y="T - 18" text-anchor="end" class="ax-cap ax-s">均响(s)</text>
            <text v-if="lMax > 0" :x="L" :y="T - 18" class="ax-cap">数量</text>
            <text v-if="rMax > 0" :x="W - R" :y="T - 18" text-anchor="end" class="ax-cap ax-r">比率</text>
            <!-- 平滑面积曲线序列（半透明面积垫底 + 曲线描边；圆点仅悬浮命中列显示） -->
            <g v-for="s in visible" :key="s.key">
              <path v-if="n > 1" class="area" :d="areaD(s)" :style="{ fill: s.color }" fill-opacity="0.15" />
              <path v-if="n > 1" class="line" :d="lineD(s)" fill="none" :style="{ stroke: s.color }" stroke-width="2.2" stroke-linecap="round" />
              <circle v-if="hover" :cx="x(hover.i)" :cy="yOf(s)(s.points[hover.i])" r="4" :style="{ fill: s.color }" />
            </g>
            <line
              v-if="hover && visible.length > 0"
              :x1="x(hover.i)"
              :x2="x(hover.i)"
              :y1="T"
              :y2="H - B"
              stroke="var(--color-text-3)"
              stroke-dasharray="4 4"
              opacity="0.5"
            />
            <template v-for="(lb, i) in labels" :key="`${lb}-${i}`">
              <text v-if="i % step === 0 || i === n - 1" :x="x(i)" :y="H - 10" text-anchor="middle" class="ax">{{ lb }}</text>
            </template>
          </svg>
          <div v-if="visible.length === 0" class="rc-monchart-empty">已隐藏全部指标，点击上方胶囊恢复显示</div>
          <div
            v-if="hover && visible.length > 0"
            class="rc-monchart-tip"
            :style="{
              left: hover.px + 'px',
              top: hover.py + 'px',
              transform: hover.px > wrapW() - 190 ? 'translate(calc(-100% - 12px), -50%)' : 'translate(12px, -50%)',
            }"
          >
            <div class="rc-monchart-tip-date">{{ labels[hover.i] }}</div>
            <div v-for="s in visible" :key="s.key" class="rc-monchart-tip-line">
              <i :style="{ background: s.color }" />
              {{ s.name }}
              <b>{{ s.fmt(s.points[hover.i]) }}</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Modal>
</template>
