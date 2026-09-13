<script setup lang="ts">
import { computed, ref } from 'vue';
import { chartPeriod, formatChartValue, makeTrendValues, parseNumberText } from './trendChart';

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
  // X轴标签：最多显示13个（小时轴每 2 小时一个），避免密集刻度太挤
  const step = Math.max(1, Math.ceil(labels.length / 13));
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
