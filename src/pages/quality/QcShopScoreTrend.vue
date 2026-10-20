<!-- 店铺评分趋势弹层（优化任务·店铺优化行「趋势图」）：与店铺列表「评分趋势」同口径同视觉（四维体验分＋平台均值虚线、近7/30/90天、图例显隐、悬浮取值卡）；
     额外叠加优化任务周期区间色带（同商品趋势 optRange 语言），看优化前后体验分对比 -->
<script setup lang="ts">
import { computed, ref } from 'vue';
import Modal from '../../components/Modal.vue';
import { qcShops, type OnlineShop } from './qcOnlineData';

const props = defineProps<{
  shop: OnlineShop;
  optRange?: { start: string; end: string; openEnd?: boolean } | null;
  onClose: () => void;
}>();

const TREND_RANGES = [7, 30, 90];
const range = ref(30);
const N = computed(() => range.value);

const pad2 = (n: number) => String(n).padStart(2, '0');
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
/* 末端锚定今日，起点按范围回推 */
const tLabel = (i: number) => {
  const d = new Date(`${todayIso()}T00:00:00`);
  d.setDate(d.getDate() - (N.value - 1 - i));
  return `${d.getMonth() + 1}/${pad2(d.getDate())}`;
};
const seedOf = (key: string) => (([...key].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 89) + 3);
const seriesOfN = (n: number, key: string, cur: number): number[] => {
  const seed = seedOf('shop-' + key);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const wave = Math.sin(seed * 1.3 + i * 0.55) * 0.5 + Math.sin(seed * 2.7 + i * 0.21) * 0.5;
    out.push(cur + wave * 0.05 - (1 - t) * 0.06 * (seed % 2 ? 1 : -1));
  }
  out[n - 1] = cur;
  return out.map((v) => Math.round(v * 100) / 100);
};
const seriesOf = (key: string, cur: number) => seriesOfN(N.value, key, cur);
const platAvgOf = (p: OnlineShop['platform']) => {
  const list = qcShops.value.filter((s) => s.platform === p && !s.isNew);
  return Math.round((list.reduce((a, s) => a + s.score, 0) / Math.max(list.length, 1)) * 100) / 100;
};

type TrendKey = 'score' | 'goods' | 'logistics' | 'service' | 'platavg';
const TREND_META: { key: TrendKey; label: string; color: string; dash?: boolean }[] = [
  { key: 'score', label: '店铺体验分', color: '#4f7cff' },
  { key: 'goods', label: '商品体验', color: '#00b42a' },
  { key: 'logistics', label: '物流体验', color: '#ff7d00' },
  { key: 'service', label: '服务体验分', color: '#f53f3f' },
  { key: 'platavg', label: '平台店铺体验分均值', color: '#86909c', dash: true },
];
const trendSeries = computed(() =>
  TREND_META.map((m) => {
    const cur = m.key === 'platavg' ? platAvgOf(props.shop.platform) : props.shop[m.key];
    return { ...m, cur, pts: seriesOf(`${props.shop.id}-${m.key}`, cur) };
  }),
);
const hiddenKeys = ref<string[]>([]);
const toggleSeries = (k: string) => {
  const i = hiddenKeys.value.indexOf(k);
  if (i >= 0) hiddenKeys.value.splice(i, 1);
  else hiddenKeys.value.push(k);
  hover.value = null;
};
const visibleSeries = computed(() => trendSeries.value.filter((m) => !hiddenKeys.value.includes(m.key)));

/* 图区几何：viewBox 1000x300；取值域随可见序列自适应（含上下留白） */
const TW = 1000;
const TH = 300;
const TL = 46;
const TR = 18;
const TT = 18;
const TB = 34;
const domain = computed(() => {
  const src = visibleSeries.value.length ? visibleSeries.value : trendSeries.value;
  const vals = src.flatMap((m) => m.pts);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = Math.max((max - min) * 0.18, 0.05);
  return { lo: Math.floor((min - pad) * 20) / 20, hi: Math.ceil((max + pad) * 20) / 20 };
});
const ticks = computed(() => {
  const { lo, hi } = domain.value;
  return [0, 1, 2, 3, 4].map((k) => Math.round((lo + ((hi - lo) * k) / 4) * 100) / 100);
});
const fmt = (v: number) => v.toFixed(2);
const tx = (i: number) => TL + (i * (TW - TL - TR)) / (N.value - 1);
const ty = (v: number) => TT + (1 - (v - domain.value.lo) / (domain.value.hi - domain.value.lo)) * (TH - TT - TB);
const lineOf = (pts: number[]) => pts.map((v, i) => tx(i).toFixed(1) + ',' + ty(v).toFixed(1)).join(' ');
const TX_IDX = computed(() => {
  const n = N.value;
  const k = Math.min(n, 7);
  return Array.from({ length: k }, (_, j) => Math.round((j * (n - 1)) / (k - 1)));
});

/* 优化周期区间色带（同商品趋势 optRange 语言）：把周期起止映射到近 N 天窗口索引，openEnd/超窗截到窗口末 */
const dayIdx = (iso: string) => {
  const end = new Date(`${todayIso()}T00:00:00`).getTime();
  const d = new Date(`${iso}T00:00:00`).getTime();
  return N.value - 1 - Math.round((end - d) / 86400000);
};
const band = computed(() => {
  const r = props.optRange;
  if (!r) return null;
  const i0 = Math.max(0, Math.min(N.value - 1, dayIdx(r.start)));
  const i1 = Math.max(0, Math.min(N.value - 1, r.openEnd ? N.value - 1 : dayIdx(r.end)));
  if (i1 <= i0) return null;
  return { i0, i1 };
});

const hover = ref<{ i: number; w: number } | null>(null);
const onMove = (e: MouseEvent) => {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const xv = ((e.clientX - r.left) / Math.max(r.width, 1)) * TW;
  hover.value = { i: Math.max(0, Math.min(N.value - 1, Math.round(((xv - TL) / (TW - TL - TR)) * (N.value - 1)))), w: r.width };
};
const TTIP_W = 200;
const tipStyle = () => {
  const h = hover.value;
  if (!h) return {};
  const px = (tx(h.i) / TW) * h.w;
  if (px + 14 + TTIP_W <= h.w) return { left: px + 14 + 'px' };
  return { left: px - 14 + 'px', transform: 'translateX(-100%)' };
};
const setRange = (r: number) => {
  range.value = r;
  hover.value = null;
};
</script>

<template>
  <Modal title="评分趋势" :sub="`${shop.name} · ${shop.platform} · 近 ${range} 天`" size="xl" @close="onClose">
    <div class="qs-thead">
      <div class="qs-legend">
        <span
          v-for="m in trendSeries"
          :key="m.key"
          class="tl-pill"
          :class="{ off: hiddenKeys.includes(m.key) }"
          :title="hiddenKeys.includes(m.key) ? '点击显示该指标' : '点击隐藏该指标'"
          @click="toggleSeries(m.key)"
        ><i :style="{ background: m.color }" />{{ m.label }}<b>{{ fmt(m.cur) }}</b></span>
      </div>
      <div class="qs-range">
        <button v-for="r in TREND_RANGES" :key="r" type="button" :class="{ on: range === r }" @click="setRange(r)">近 {{ r }} 天</button>
      </div>
    </div>
    <div class="qs-panel" @mousemove="onMove" @mouseleave="hover = null">
      <svg :viewBox="`0 0 ${TW} ${TH}`">
        <text class="ax-unit" :x="TL - 38" :y="12">分</text>
        <g v-if="band" class="qs-band">
          <rect :x="tx(band.i0)" :y="TT" :width="tx(band.i1) - tx(band.i0)" :height="TH - TT - TB" />
          <line :x1="tx(band.i0)" :x2="tx(band.i0)" :y1="TT" :y2="TH - TB" />
          <line :x1="tx(band.i1)" :x2="tx(band.i1)" :y1="TT" :y2="TH - TB" />
          <text :x="(tx(band.i0) + tx(band.i1)) / 2" :y="TT + 14" text-anchor="middle" class="qs-band-lb">优化周期</text>
        </g>
        <g v-for="t in ticks" :key="t">
          <line :x1="TL" :x2="TW - TR" :y1="ty(t)" :y2="ty(t)" stroke="#e5e6eb" stroke-dasharray="4 4" />
          <text class="ax-y" :x="TL - 8" :y="ty(t) + 4" text-anchor="end">{{ fmt(t) }}</text>
        </g>
        <text v-for="i in TX_IDX" :key="'x' + i" class="ax-x" :x="tx(i)" :y="TH - 10" text-anchor="middle">{{ tLabel(i) }}</text>
        <g v-for="m in visibleSeries" :key="m.key">
          <polyline :points="lineOf(m.pts)" fill="none" :stroke="m.color" stroke-width="2" stroke-linejoin="round" :stroke-dasharray="m.dash ? '6 5' : undefined" />
          <circle v-for="(v, i) in m.pts" :key="i" :cx="tx(i)" :cy="ty(v)" r="3" :fill="m.color" />
        </g>
        <line v-if="hover" :x1="tx(hover.i)" :x2="tx(hover.i)" :y1="TT" :y2="TH - TB" stroke="#c9cdd4" stroke-dasharray="4 4" />
      </svg>
      <div v-if="hover && visibleSeries.length" class="qs-tip" :style="tipStyle()">
        <div class="tt-date">{{ tLabel(hover.i) }}</div>
        <div v-for="m in visibleSeries" :key="m.key" class="tt-row"><i :style="{ background: m.color }" />{{ m.label }}<b>{{ fmt(m.pts[hover.i]) }}</b></div>
      </div>
    </div>
    <template #foot>
      <button class="btn primary" @click="onClose">关闭</button>
    </template>
  </Modal>
</template>

<style scoped>
.qs-thead { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.qs-legend { display: flex; flex-wrap: wrap; gap: 8px; }
.qs-legend .tl-pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border: 1px solid #e5e6eb; border-radius: 999px; background: #fff; font-size: 12px; color: #445066; cursor: pointer; }
.qs-legend .tl-pill i { width: 8px; height: 8px; border-radius: 50%; }
.qs-legend .tl-pill b { font-weight: 600; color: #1d2129; }
.qs-legend .tl-pill.off { opacity: 0.45; }
.qs-range { display: inline-flex; gap: 4px; flex: none; }
.qs-range button { padding: 4px 10px; border: 1px solid #e5e6eb; border-radius: 6px; background: #fff; font-size: 12px; color: #445066; cursor: pointer; }
.qs-range button.on { color: var(--color-primary); border-color: var(--color-primary); background: rgba(79, 124, 255, 0.06); }
.qs-panel { position: relative; }
.qs-panel svg { width: 100%; height: auto; display: block; }
.qs-panel .ax-unit, .qs-panel .ax-y, .qs-panel .ax-x { font-size: 11px; fill: #86909c; }
.qs-band rect { fill: rgba(255, 125, 0, 0.08); }
.qs-band line { stroke: #ff7d00; stroke-dasharray: 4 4; opacity: 0.55; }
.qs-band-lb { font-size: 12px; font-weight: 600; fill: #ff7d00; }
.qs-tip { position: absolute; top: 8px; min-width: 190px; padding: 8px 10px; border-radius: 8px; background: rgba(29, 33, 41, 0.92); color: #fff; font-size: 12px; pointer-events: none; z-index: 2; }
.qs-tip .tt-date { color: rgba(255, 255, 255, 0.7); margin-bottom: 6px; }
.qs-tip .tt-row { display: flex; align-items: center; gap: 6px; line-height: 20px; }
.qs-tip .tt-row i { width: 8px; height: 8px; border-radius: 50%; }
.qs-tip .tt-row b { margin-left: auto; font-weight: 600; }
</style>
