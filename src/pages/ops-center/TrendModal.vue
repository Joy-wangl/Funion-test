<script setup lang="ts">
import { computed, ref } from 'vue';
import { CMP_COLORS, chartPeriod, formatChartValue, makeTrendValues, parseNumberText } from './trendChart';

const props = defineProps<{
  metric: string;
  /** 对应 KPI 卡片上的数值文本（用于生成趋势基准值） */
  kpiValueText: string;
  /** 当前统计时间文本 */
  dateText: string;
  /** 当前时间模式：realtime / 7 / 30 / custom */
  mode: string;
  /** 当前可见的 KPI 卡片（左侧对比指标选项源） */
  kpis: { metric: string; value: string }[];
}>();
const emit = defineEmits<{ (e: 'close'): void }>();

const chartType = ref<'line' | 'bar'>('line');

/* ---------- 对比指标：当前卡片固定首序列，胶囊勾选其它卡片加入对比；支持一键清空 ---------- */
const cmp = ref<string[]>([]);
const toggleCmp = (name: string) => {
  cmp.value = cmp.value.includes(name) ? cmp.value.filter((m) => m !== name) : [...cmp.value, name];
};
const clearCmp = () => {
  cmp.value = [];
};
const isCmpActive = (name: string) => name === props.metric || cmp.value.includes(name);
/* 选中胶囊圆点预览序列色（与图表序列同序：当前指标居首）；未选中由 CSS 回落灰点 */
const cmpColor = (name: string) => CMP_COLORS[[props.metric, ...cmp.value].indexOf(name) % CMP_COLORS.length];

/* ---------- ChartSvg 几何计算（多序列 line/bar 双模式；各序列按自身量程归一后同框） ---------- */
const W = 900;
const H = 400;
const L = 58;
const R = 18;
const T = 22;
const B = 54;

/* 平滑路径（Catmull-Rom → 贝塞尔，同品控 MetricTrendChart） */
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

const chart = computed(() => {
  const period = chartPeriod(props.dateText, props.mode);
  const labels = period.labels;
  const n = labels.length;
  const plotW = W - L - R;
  const plotH = H - T - B;
  const x = (i: number) => (n <= 1 ? L + plotW / 2 : L + i * (plotW / (n - 1)));
  const names = [props.metric, ...cmp.value];
  const series = names.map((m, idx) => {
    const base = m === props.metric ? parseNumberText(props.kpiValueText) : parseNumberText(props.kpis.find((k) => k.metric === m)?.value ?? '');
    const values = makeTrendValues(m, n, base);
    let min = Math.min.apply(null, values);
    let max = Math.max.apply(null, values);
    if (max === min) max = min + 1;
    const pad = (max - min) * 0.15;
    min = Math.max(0, min - pad);
    max += pad;
    const y = (v: number) => T + ((max - v) / (max - min)) * plotH;
    const pts = values.map((v, i) => ({ x: x(i), y: y(v) }));
    return {
      metric: m,
      color: CMP_COLORS[idx % CMP_COLORS.length],
      values,
      valueText: formatChartValue(m, base),
      path: smoothPath(pts),
      dots: pts.map((p, i) => ({ i, cx: p.x, cy: p.y })),
      min,
      max,
      bars: [] as { i: number; bx: number; by: number; bh: number }[],
    };
  });
  /* 柱状：多序列按索引分组并排，单序列时退化为居中单柱 */
  const cnt = series.length;
  const bw = Math.max(3, Math.min(26, (plotW / n) * 0.62 / cnt));
  series.forEach((s, si) => {
    s.bars = s.values.map((v, i) => {
      const by = T + ((s.max - v) / (s.max - s.min)) * plotH;
      return { i, bx: x(i) - (cnt * bw) / 2 + si * bw, by, bh: T + plotH - by };
    });
  });
  /* X轴标签：最多显示13个（小时轴每 2 小时一个），避免密集刻度太挤 */
  const step = Math.max(1, Math.ceil(n / 13));
  const xLabels = labels.map((label, i) => ({ i, label, x: x(i), show: i % step === 0 || i === n - 1 }));
  /* Y轴刻度：单序列显示真实刻度；多序列各序列量程归一，仅留网格线 */
  const s0 = series[0];
  const grids = [0, 1, 2, 3, 4].map((g) => ({
    g,
    gy: T + g * (plotH / 4),
    text: cnt === 1 ? formatChartValue(props.metric, s0.max - g * ((s0.max - s0.min) / 4)) : '',
  }));
  return { desc: period.desc, labels, n, xs: labels.map((_, i) => x(i)), series, grids, xLabels, bw };
});

/* ---------- 悬浮交互：导引线 + 圆点/柱高亮 + 锚点气泡多序列读数 ---------- */
const hover = ref<{ i: number; px: number; py: number } | null>(null);
const chartRef = ref<HTMLDivElement | null>(null);
const chartW = () => chartRef.value?.clientWidth ?? 900;
const onMove = (e: MouseEvent) => {
  const wrap = chartRef.value;
  const svg = wrap?.querySelector('svg');
  if (!wrap || !svg || !chart.value.n) return;
  const rect = svg.getBoundingClientRect();
  const n = chart.value.n;
  const fx = ((e.clientX - rect.left) / rect.width) * W;
  const i = Math.max(0, Math.min(n - 1, Math.round(((fx - L) / (W - L - R)) * (n - 1))));
  const wr = wrap.getBoundingClientRect();
  hover.value = {
    i,
    px: (chart.value.xs[i] / W) * rect.width,
    py: Math.max(28, Math.min(e.clientY - wr.top, wr.height - 28)),
  };
};

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
        <!-- 图表类型切换：分段控件（灰底轨道＋白底选中项），头部右侧关闭钮前 -->
        <div class="chart-seg">
          <button class="chart-type" :class="chartType === 'line' ? 'active' : ''" @click="chartType = 'line'">
            折线图
          </button>
          <button class="chart-type" :class="chartType === 'bar' ? 'active' : ''" @click="chartType = 'bar'">
            柱状图
          </button>
        </div>
        <button class="trend-close" @click="emit('close')">
          ×
        </button>
      </div>
      <div class="trend-body cmp-body">
        <!-- 对比指标：胶囊横排多选（圆点预览序列色、不含数值），行尾一键清空 -->
        <div class="cmp-bar">
          <span class="cmp-title">对比指标</span>
          <div class="cmp-chips">
            <button
              v-for="k in kpis"
              :key="k.metric"
              class="cmp-chip"
              :class="{ active: isCmpActive(k.metric) }"
              :disabled="k.metric === metric"
              @click="toggleCmp(k.metric)"
            >
              <i class="cmp-dot" :style="isCmpActive(k.metric) ? { background: cmpColor(k.metric) } : null" />{{ k.metric }}
            </button>
            <button class="cmp-chip cmp-clear" :disabled="!cmp.length" @click="clearCmp">
              清空
            </button>
          </div>
        </div>
        <div class="cmp-main">
          <div v-if="chart.series.length > 1" class="cmp-legend">
            <span v-for="s in chart.series" :key="s.metric" class="cmp-legend-item">
              <span class="cmp-dot" :style="{ background: s.color }" />
              {{ s.metric }}
              <span class="cmp-val">{{ s.valueText }}</span>
            </span>
          </div>
          <div ref="chartRef" class="trend-chart">
            <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" @mousemove="onMove" @mouseleave="hover = null">
              <!-- 横向网格和Y轴标签（多序列归一时不显示刻度值） -->
              <g v-for="gd in chart.grids" :key="`grid-${gd.g}`">
                <line :x1="L" :y1="gd.gy" :x2="W - R" :y2="gd.gy" stroke="#eef1f5" stroke-width="1" />
                <text v-if="gd.text" :x="L - 8" :y="gd.gy + 4" text-anchor="end" font-size="11" fill="#98a0ae">
                  {{ gd.text }}
                </text>
              </g>
              <template v-for="xl in chart.xLabels" :key="`x-${xl.i}`">
                <text v-if="xl.show" :x="xl.x" :y="H - 20" text-anchor="middle" font-size="11" fill="#8a91a0">
                  {{ xl.label }}
                </text>
              </template>
              <!-- 悬浮导引线 -->
              <line
                v-if="hover"
                :x1="chart.xs[hover.i]"
                :x2="chart.xs[hover.i]"
                :y1="T"
                :y2="H - B"
                stroke="#8a94a6"
                stroke-width="1"
                stroke-dasharray="4 4"
                opacity="0.5"
              />
              <template v-if="chartType === 'bar'">
                <template v-for="s in chart.series" :key="`bar-${s.metric}`">
                  <rect
                    v-for="bar in s.bars"
                    :key="`bar-${s.metric}-${bar.i}`"
                    :x="bar.bx"
                    :y="bar.by"
                    :width="chart.bw * 0.86"
                    :height="bar.bh"
                    rx="3"
                    :fill="s.color"
                    :opacity="hover?.i === bar.i ? 1 : 0.86"
                  />
                </template>
              </template>
              <template v-else>
                <template v-for="s in chart.series" :key="`line-${s.metric}`">
                  <path :d="s.path" fill="none" :stroke="s.color" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
                  <circle
                    v-for="dot in s.dots"
                    :key="`dot-${s.metric}-${dot.i}`"
                    :cx="dot.cx"
                    :cy="dot.cy"
                    :r="hover?.i === dot.i ? 4.5 : 2.8"
                    fill="#fff"
                    :stroke="s.color"
                    :stroke-width="hover?.i === dot.i ? 2.4 : 2"
                  />
                </template>
              </template>
            </svg>
            <!-- 悬浮气泡：时间 + 各序列读数，靠右自动翻转 -->
            <div
              v-if="hover"
              class="tm-tip"
              :style="{
                left: hover.px + 'px',
                top: hover.py + 'px',
                transform: hover.px > chartW() - 200 ? 'translate(calc(-100% - 12px), -50%)' : 'translate(12px, -50%)',
              }"
            >
              <div class="tm-tip-date">{{ chart.labels[hover.i] }}</div>
              <div v-for="s in chart.series" :key="`tip-${s.metric}`" class="tm-tip-line">
                <i :style="{ background: s.color }" /><span>{{ s.metric }}</span><b>{{ formatChartValue(s.metric, s.values[hover.i]) }}</b>
              </div>
            </div>
          </div>
          <div class="chart-tip">图表数据为当前原型示例，后续可接入真实业务数据。</div>
        </div>
      </div>
    </div>
  </div>
</template>
