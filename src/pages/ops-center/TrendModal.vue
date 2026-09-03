<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{
  metric: string;
  /** 对应 KPI 卡片上的数值文本（用于生成趋势基准值） */
  kpiValueText: string;
  /** 当前统计时间文本 */
  dateText: string;
  /** 当前时间模式：realtime / 7 / 30 / custom */
  mode: string;
}>();
const emit = defineEmits<{ (e: 'close'): void }>();

function parseNumberText(txt: string) {
  const s = (txt || '').replace(/[¥,%]/g, '').replace(/,/g, '').trim();
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}
function isRateMetric(name: string) {
  return name.indexOf('率') > -1;
}
function metricUnit(name: string) {
  if (isRateMetric(name)) return '%';
  if (name.indexOf('利润') > -1 || name.indexOf('费') > -1 || name.indexOf('成本') > -1 || name === '销售金额')
    return '¥';
  return '';
}
function formatChartValue(name: string, v: number) {
  if (isRateMetric(name)) return v.toFixed(1) + '%';
  if (metricUnit(name) === '¥') return '¥' + Math.round(v).toLocaleString();
  if (name === '店铺数' || name === '下架链接数') return v.toFixed(0);
  return Math.round(v).toLocaleString();
}
function dateAdd(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function parseYmd(s: string) {
  const a = s.split('-');
  if (a.length !== 3) return null;
  return new Date(+a[0], +a[1] - 1, +a[2]);
}
function chartPeriod(dateText: string, mode: string) {
  const text = dateText.trim();
  if (text.indexOf('~') > -1) {
    const ps = text.split('~').map((x) => x.trim());
    const s = parseYmd(ps[0]);
    const e = parseYmd(ps[1]);
    if (s && e) {
      const labels: string[] = [];
      let cur = new Date(s);
      let guard = 0;
      while (cur <= e && guard < 31) {
        labels.push(cur.getMonth() + 1 + '/' + cur.getDate());
        cur = dateAdd(cur, 1);
        guard++;
      }
      return { labels, desc: text };
    }
  }
  if (mode === '7') {
    const e7 = new Date(2026, 7, 12);
    const l7: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d7 = dateAdd(e7, -i);
      l7.push(d7.getMonth() + 1 + '/' + d7.getDate());
    }
    return { labels: l7, desc: '近7天' };
  }
  if (mode === '30') {
    const e30 = new Date(2026, 7, 12);
    const l30: string[] = [];
    for (let j = 29; j >= 0; j--) {
      const d30 = dateAdd(e30, -j);
      l30.push(d30.getMonth() + 1 + '/' + d30.getDate());
    }
    return { labels: l30, desc: '近30天' };
  }
  if (mode === 'month') {
    const mp = text.split('-');
    const my = +mp[0];
    const mm = +mp[1];
    if (my && mm) {
      const n = new Date(my, mm, 0).getDate();
      const lm: string[] = [];
      for (let i = 1; i <= n; i++) lm.push(mm + '/' + i);
      return { labels: lm, desc: text };
    }
  }
  if (mode === 'day') {
    return { labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'], desc: '日 · ' + text };
  }
  return { labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'], desc: '实时 · ' + text };
}
function makeTrendValues(metric: string, count: number, base: number) {
  const factors = [
    0.82, 0.91, 0.88, 1.02, 0.97, 1.08, 1.0, 1.05, 0.94, 1.11, 1.03, 0.98, 1.07, 1.02, 0.96, 1.09, 1.12, 1.04,
    0.99, 1.06, 1.01, 0.95, 1.1, 1.03, 1.08, 1.0, 0.97, 1.05, 1.02, 1.0, 1.04,
  ];
  const vals: number[] = [];
  for (let i = 0; i < count; i++) {
    const f = factors[i % factors.length];
    const wave = Math.sin(i * 0.83) * 0.055;
    let v = base * (f + wave);
    if (isRateMetric(metric)) v = Math.max(0, v);
    vals.push(v);
  }
  if (vals.length) vals[vals.length - 1] = base;
  return vals;
}

const chartType = ref<'line' | 'bar'>('line');

const chart = computed(() => {
  const base = parseNumberText(props.kpiValueText);
  const period = chartPeriod(props.dateText, props.mode);
  return { ...period, values: makeTrendValues(props.metric, period.labels.length, base) };
});

/* ---------- ChartSvg 几何计算（line/bar 双模式） ---------- */
const W = 820;
const H = 320;
const L = 58;
const R = 18;
const T = 22;
const B = 54;

const geo = computed(() => {
  const labels = chart.value.labels;
  const values = chart.value.values;
  const plotW = W - L - R;
  const plotH = H - T - B;
  let min = Math.min.apply(null, values);
  let max = Math.max.apply(null, values);
  if (max === min) max = min + 1;
  const pad = (max - min) * 0.15;
  min = Math.max(0, min - pad);
  max = max + pad;
  const y = (v: number) => T + ((max - v) / (max - min)) * plotH;
  const x = (i: number) => (labels.length <= 1 ? L + plotW / 2 : L + i * (plotW / (labels.length - 1)));
  // X轴标签：最多显示10个，避免30天太挤
  const step = Math.max(1, Math.ceil(labels.length / 10));
  const bw = Math.max(8, Math.min(34, plotW / (labels.length * 1.6)));
  const grids = [0, 1, 2, 3, 4].map((g) => ({
    g,
    gy: T + g * (plotH / 4),
    text: formatChartValue(props.metric, max - g * ((max - min) / 4)),
  }));
  const xLabels = labels.map((label, i) => ({ i, label, x: x(i), show: i % step === 0 || i === labels.length - 1 }));
  const bars = values.map((v, b) => {
    const by = y(v);
    return { b, bx: x(b) - bw / 2, by, bh: T + plotH - by };
  });
  const dots = values.map((v, c) => ({ c, cx: x(c), cy: y(v) }));
  const polyline = values.map((v, p) => `${x(p)},${y(v)}`).join(' ');
  return { grids, xLabels, bars, dots, polyline, bw };
});

const onMaskClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) emit('close');
};
</script>

<template>
  <div class="trend-mask show" @click="onMaskClick">
    <div class="trend-modal">
      <div class="trend-head">
        <div>
          <div class="trend-title">{{ metric }}趋势</div>
          <div class="trend-sub">统计时间：{{ dateText }}　·　{{ chart.desc }}</div>
        </div>
        <button class="trend-close" @click="emit('close')">
          ×
        </button>
      </div>
      <div class="trend-toolbar">
        <button class="chart-type" :class="chartType === 'line' ? 'active' : ''" @click="chartType = 'line'">
          折线图
        </button>
        <button class="chart-type" :class="chartType === 'bar' ? 'active' : ''" @click="chartType = 'bar'">
          柱状图
        </button>
      </div>
      <div class="trend-body">
        <div class="trend-chart">
          <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none">
            <!-- 横向网格和Y轴标签 -->
            <g v-for="gd in geo.grids" :key="`grid-${gd.g}`">
              <line :x1="L" :y1="gd.gy" :x2="W - R" :y2="gd.gy" stroke="#eef1f5" stroke-width="1" />
              <text :x="L - 8" :y="gd.gy + 4" text-anchor="end" font-size="11" fill="#98a0ae">
                {{ gd.text }}
              </text>
            </g>
            <template v-for="xl in geo.xLabels" :key="`x-${xl.i}`">
              <text v-if="xl.show" :x="xl.x" :y="H - 20" text-anchor="middle" font-size="11" fill="#8a91a0">
                {{ xl.label }}
              </text>
            </template>
            <template v-if="chartType === 'bar'">
              <rect
                v-for="bar in geo.bars"
                :key="`bar-${bar.b}`"
                :x="bar.bx"
                :y="bar.by"
                :width="geo.bw"
                :height="bar.bh"
                rx="4"
                fill="#6b8cff"
                opacity="0.86"
              />
            </template>
            <template v-else>
              <polyline
                fill="none"
                stroke="#4f7cff"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
                :points="geo.polyline"
              />
              <circle
                v-for="dot in geo.dots"
                :key="`dot-${dot.c}`"
                :cx="dot.cx"
                :cy="dot.cy"
                r="3.5"
                fill="#fff"
                stroke="#4f7cff"
                stroke-width="2"
              />
            </template>
          </svg>
        </div>
        <div class="chart-tip">图表数据为当前原型示例，后续可接入真实业务数据。</div>
      </div>
    </div>
  </div>
</template>
